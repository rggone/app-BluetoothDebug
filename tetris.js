class BluetoothController {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.connectedDevice = null;
        this.devicesList = new Map();
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.initBtn = document.getElementById('initBluetooth');
        this.scanBtn = document.getElementById('scanDevices');
        this.devicesListElement = document.getElementById('devicesList');
        this.statusText = document.getElementById('statusText');
        this.controlButtons = document.querySelectorAll('.control');
        this.receivedDataElement = document.getElementById('receivedData');
    }

    initEventListeners() {
        this.initBtn.addEventListener('click', () => this.initializeBluetooth());
        this.scanBtn.addEventListener('click', () => this.toggleScan());
        
        this.controlButtons.forEach((button, index) => {
            button.addEventListener('click', () => this.sendCommand(index + 1));
        });
    }

    updateStatus(message) {
        this.statusText.textContent = message;
        console.log(message);
    }

    async initializeBluetooth() {
        try {
            await new Promise((resolve, reject) => {
                plus.bluetooth.openBluetoothAdapter({
                    success: resolve,
                    fail: reject
                });
            });

            this.isInitialized = true;
            this.scanBtn.disabled = false;
            this.updateStatus('蓝牙已初始化');

            this.setupBluetoothListeners();
        } catch (error) {
            this.updateStatus('蓝牙初始化失败: ' + error.message);
        }
    }

    setupBluetoothListeners() {
        plus.bluetooth.onBluetoothDeviceFound((devices) => {
            devices.devices.forEach(device => {
                if (!this.devicesList.has(device.deviceId)) {
                    this.devicesList.set(device.deviceId, device);
                    this.addDeviceToList(device);
                }
            });
        });

        plus.bluetooth.onBLEConnectionStateChange((res) => {
            if (!res.connected) {
                this.handleDisconnection();
            }
        });
    }

    toggleScan() {
        if (!this.isScanning) {
            this.startScan();
        } else {
            this.stopScan();
        }
    }

    async startScan() {
        try {
            await new Promise((resolve, reject) => {
                plus.bluetooth.startBluetoothDevicesDiscovery({
                    success: resolve,
                    fail: reject
                });
            });

            this.isScanning = true;
            this.scanBtn.textContent = '停止扫描';
            this.updateStatus('正在扫描设备...');
        } catch (error) {
            this.updateStatus('扫描失败: ' + error.message);
        }
    }

    async stopScan() {
        try {
            await new Promise((resolve, reject) => {
                plus.bluetooth.stopBluetoothDevicesDiscovery({
                    success: resolve,
                    fail: reject
                });
            });

            this.isScanning = false;
            this.scanBtn.textContent = '扫描设备';
            this.updateStatus('扫描已停止');
        } catch (error) {
            this.updateStatus('停止扫描失败: ' + error.message);
        }
    }

    addDeviceToList(device) {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device-item';
        deviceElement.innerHTML = `
            <span>${device.name || '未命名设备'} (${device.deviceId})</span>
            <button class="btn primary">连接</button>
        `;

        deviceElement.querySelector('button').addEventListener('click', () => {
            this.connectToDevice(device.deviceId);
        });

        this.devicesListElement.appendChild(deviceElement);
    }

    async connectToDevice(deviceId) {
        try {
            await new Promise((resolve, reject) => {
                plus.bluetooth.createBLEConnection({
                    deviceId: deviceId,
                    success: resolve,
                    fail: reject
                });
            });

            this.connectedDevice = deviceId;
            this.updateStatus('设备连接成功');
            this.enableControlButtons();
            await this.getDeviceServices(deviceId);
        } catch (error) {
            this.updateStatus('连接失败: ' + error.message);
        }
    }

    async getDeviceServices(deviceId) {
        try {
            const result = await new Promise((resolve, reject) => {
                plus.bluetooth.getBLEDeviceServices({
                    deviceId: deviceId,
                    success: resolve,
                    fail: reject
                });
            });

            for (let service of result.services) {
                await this.getCharacteristics(deviceId, service.uuid);
            }
        } catch (error) {
            console.error('获取服务失败:', error);
        }
    }

    async getCharacteristics(deviceId, serviceId) {
        try {
            const result = await new Promise((resolve, reject) => {
                plus.bluetooth.getBLEDeviceCharacteristics({
                    deviceId: deviceId,
                    serviceId: serviceId,
                    success: resolve,
                    fail: reject
                });
            });

            // 存储特征值信息供后续使用
            this.characteristics = result.characteristics;
        } catch (error) {
            console.error('获取特征值失败:', error);
        }
    }

    enableControlButtons() {
        this.controlButtons.forEach(button => {
            button.disabled = false;
        });
    }

    async sendCommand(commandNumber) {
        if (!this.connectedDevice) {
            this.updateStatus('未连接设备');
            return;
        }

        // 这里需要根据实际设备协议修改命令内容
        const command = new Uint8Array([commandNumber]);
        
        try {
            await new Promise((resolve, reject) => {
                plus.bluetooth.writeBLECharacteristicValue({
                    deviceId: this.connectedDevice,
                    serviceId: this.characteristics[0].serviceId,
                    characteristicId: this.characteristics[0].uuid,
                    value: command.buffer,
                    success: resolve,
                    fail: reject
                });
            });

            this.updateStatus(`命令${commandNumber}已发送`);
        } catch (error) {
            this.updateStatus('发送命令失败: ' + error.message);
        }
    }

    handleDisconnection() {
        this.connectedDevice = null;
        this.controlButtons.forEach(button => {
            button.disabled = true;
        });
        this.updateStatus('设备已断开连接');
    }
}

// 等待页面加载完成后初始化
document.addEventListener('plusready', () => {
    new BluetoothController();
});
