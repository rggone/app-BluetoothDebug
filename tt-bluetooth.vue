<template>
	<view>
		<!-- <uni-nav-bar dark  :fixed="true" status-bar title="蓝牙设置"
		leftIcon="none" @clickLeft="backTo" backgroundColor="#8150CA"/> --> <!--蓝牙设置 -->
		
		<view style="padding-top: 5px;height: 87%;position: absolute;width: 100%;">
			<view style="background-color: #dfdfdf;font-size: 15px;padding: 5px;font-weight: bold;color: #5b5a5a;">
				已配对设备
			</view>
			<view class="yipeidui" style="height: 35%;">
				<view v-for="(item,index) in pairedList" style="display: flex;justify-content: space-between;border-bottom: 1px solid #dfdcdc;" @click="setSelectedPaired(item)">
					<view class="lanya">
						<text>{{item.name ? item.name : item.address}}</text>
						<span style="color: red;" v-if="item.isSelected==1">&nbsp;&nbsp;已选中</span>
						<span style="color: red;" v-else></span>
					</view>
					<view class="anniu linerBtn" style="margin-top: 7px;margin-right: 5px;" @click.stop="removePaire(index)">删除设备</view>
				</view>
			</view>
			<view style="background-color: #dfdfdf;font-size: 14px;padding: 5px;font-weight: bold;color: #5b5a5a;">
				<view style="color: red;padding-bottom: 5px;">说明：如果反复操作连不到蓝牙，请退出重新登录。</view>
				<view>未配对设备</view>
			</view>
			<view class="weipeidui" style="height: 45%;">
				<view v-for="(item,index) in unpairedList" style="border-bottom: 1px solid #dfdcdc;">
					<view class="lanya" @click="createBLEConnection(item.address)">{{item.name ? item.name : item.address}}</view>
				</view>
			</view>
		</view>
		<view style="position: fixed;bottom: 0px;margin: 0 auto;width: 100%;">
			<view style="display: flex;padding: 5px 0;">
				<view style="width: 33%;">
					<button class="anniu cancelLiner" @click="close($event)" style="background-color: gray;">关闭</button>
				</view>
				<view style="width: 33%;">
					<view class="anniu linerBtn" @click="blueTooth()">{{bluetooth==1 ? turnOnBluetooth : turnOffBluetooth}}</view>
				</view>
				<view style="width: 33%;">
					<view class="anniu linerBtn"  @click="openBluetoothAdapter()">搜索蓝牙</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				bluetooth:1,//1：打开蓝牙  2：关闭蓝牙
				turnOnBluetooth:"打开蓝牙", //打开蓝牙
				turnOffBluetooth:"关闭蓝牙",//关闭蓝牙
				backgroundColor:"#cecece", //搜索蓝牙按钮背景颜色
				
				title: 'Hello',
				searchLoadingTxt:'',
				isBlueOk:false,
				bluetimestoper:null,
				startchecktimer:null,
				timeoutOfBlueScanFailure30s:300000,
				baseList:[],
				bluetoothIndex:[],
				targetDeviceName:'',
				_deviceId:'',			//蓝牙deviceId
				pairedList:[],			//已配对蓝牙
				pairedLists:[],			//已配对蓝牙集合
				pairedHeight:0,			//已配对蓝牙显示高度
				unpairedList:[],		//未配对蓝牙
				unpairedHeight:0,		//未配对蓝牙显示高度
				bluetoothSocket:{},
			}
		},
		onLoad() {
			//判断手机蓝牙打开状态
			this.bluetoothStatus();
		},
		methods: {
			backTo(){
				uni.navigateBack({})
			},
			//关闭页面
			close(e){
				uni.navigateTo({
					url:'/pages/index/index'
				})
			},
			
			//删除已配对设备
			removePaire(index){
				var that = this;
				uni.showModal({
					title: "提示" ,
					content: "是否删除设备",
					showCancel: true,
					cancelText:  "取消",
					confirmText: "确定",
					success(res) {
						// 确定删除设备
						if (res.confirm) {
							var address = uni.getStorageSync("printerSelected").address;
							console.log("已选中蓝牙地址："+address+" 删除蓝牙地址："+that.pairedList[index].address);
							if(that.pairedList[index].address == address){
								// that.pairedList[0].isSelected=1;
								uni.setStorageSync("printerSelected","");
							}
							for (var i = 0; i < that.pairedLists.length; i++) {
								if(that.pairedLists[i].getAddress() == that.pairedList[index].address){
									that.pairedLists[i].removeBond();
								}
							}
							that.pairedList.splice(index,1);
							//存储打印机
							// uni.setStorageSync("pairedList",that.pairedList);
						} else {
							console.log("取消删除设备");
						}
					}
				})
				return false;
			},
			
			//设置已选中蓝牙
			setSelectedPaired(paired){
				var that = this;
				for(var i=0;i<that.pairedList.length;i++){
					if(that.pairedList[i].address == paired.address){
						that.pairedList[i].isSelected = 1;
					}else{
						that.pairedList[i].isSelected = 0;
					}
				}
				uni.showToast({
					title: "已选中",
					icon:"success"
				})
				paired.isSelected = 1;
				//存储已选择打印机
				uni.setStorageSync("printerSelected",paired);
				//存储打印机
				// uni.setStorageSync("pairedList",that.pairedList);
			},
			
			//判断蓝牙打开状态
			bluetoothStatus(){
				var that = this;
				const BluetoothAdapter = plus.android.importClass('android.bluetooth.BluetoothAdapter'); // 引入Java 蓝牙类
				const blueadapter = BluetoothAdapter.getDefaultAdapter(); //拿到默认蓝牙适配器方法
				if (blueadapter) {
					// 判断蓝牙是否开启
					if (blueadapter.isEnabled()) {
						// 开启
						that.bluetooth = 0;
						that.backgroundColor = "red";
						
						var yilianjie = uni.getStorageSync("printerSelected");
						var selectAddress = "";
						if(yilianjie){
							selectAddress = yilianjie.address;
						}
						// console.log("已选中地址："+selectAddress);
						
						//获取手机已配对蓝牙
						var lists = blueadapter.getBondedDevices();
						plus.android.importClass(lists);  
						var iterator = lists.iterator();  
						plus.android.importClass(iterator); 
						while (iterator.hasNext())
						{
						   var device = iterator.next();
						   that.pairedLists.push(device);
						   
						   plus.android.importClass(device); 
						   that.pairedList.push({
							   name: device.getName(),
							   address: device.getAddress(),
							   isSelected:selectAddress==device.getAddress() ? '1' : '0'
						   })
						   // console.log(device.getName()+" ###########  "+ device.getAddress());
						}
						
						//显示存储的已配对蓝牙
						// this.pairedList = uni.getStorageSync("pairedList");
					} else {
						// 关闭
						this.bluetooth = 1;
						this.backgroundColor = "#cecece";
						this.pairedList = [];
					}
					this.unpairedList = [];
				}
			},
			
			//打开蓝牙
			openBluetooth(){
				var that = this;
				// 弹出提示框
				uni.showModal({
					title:  "提示",
					content: "蓝牙尚未打开，是否打开蓝牙",
					showCancel: true,
					cancelText:  "取消",
					confirmText: "确定",
					success(res) {
						// 点击确定后通过系统打开蓝牙
						if (res.confirm) {
							const BluetoothAdapter = plus.android.importClass('android.bluetooth.BluetoothAdapter'); // 引入Java 蓝牙类
							const blueadapter = BluetoothAdapter.getDefaultAdapter();
							if (blueadapter != null) {
								that.bluetooth = 0;
								that.backgroundColor = "#8A2BCF";
								//显示存储的已配对蓝牙
								// that.pairedList = uni.getStorageSync("pairedList");
								blueadapter.enable();
								
								setTimeout(function (){
									that.bluetoothStatus();
								},2000)
							}
						} else {
							// 点击取消什么也不做
							console.log("取消打开蓝牙");
						}
					}
				})
			},
			
			//关闭蓝牙
			closeBluetooth(){
				var that = this;
				// 弹出提示框
				uni.showModal({
					title: "提示",
					content: "蓝牙已打开，是否关闭蓝牙",
					showCancel: true,
					cancelText: "取消",
					confirmText: "确定",
					success(res) {
						// 点击确定后通过系统打开蓝牙
						if (res.confirm) {
							const BluetoothAdapter = plus.android.importClass('android.bluetooth.BluetoothAdapter'); // 引入Java 蓝牙类
							const blueadapter = BluetoothAdapter.getDefaultAdapter();
							if (blueadapter != null) {
								that.bluetooth = 1;
								that.backgroundColor = "#cecece";
								that.pairedList = [];
								that.unpairedList = [];
								uni.setStorageSync("printerSelected","");
								return blueadapter.disable();
							}
						} else {
							// 点击取消什么也不做
							console.log("取消关闭蓝牙");
						}
					}
				})
			},
			
			//点击打开/关闭蓝牙按钮
			blueTooth(){
				if(this.bluetooth == 1){
					console.log("打开蓝牙");
					this.openBluetooth();
				}else{
					console.log("关闭蓝牙");
					this.closeBluetooth();
				}
			},
			
			//初始化蓝牙模块
			openBluetoothAdapter() {
				//未打开蓝牙点击搜索蓝牙提示弹窗
				if(this.bluetooth == 1){
					uni.showToast({
						title: "请先打开蓝牙",
						icon:"error"
					})
					return;
				}
				let system = uni.getSystemInfoSync(); // 获取系统信息
				if (system.platform === 'android') { // 判断平台
				  var that = this;
				  var context = plus.android.importClass("android.content.Context");
				  var locationManager = plus.android.importClass("android.location.LocationManager");
				  var main = plus.android.runtimeMainActivity();
				  var mainSvr = main.getSystemService(context.LOCATION_SERVICE);
				  // 定位检测
				  if (!mainSvr.isProviderEnabled(locationManager.GPS_PROVIDER)) {
					  uni.showModal({
						title: "提示",
						content: "请打开定位服务功能",
						showCancel: false, // 不显示取消按钮
						success() {
						  if (!mainSvr.isProviderEnabled(locationManager.GPS_PROVIDER)) {
							var Intent = plus.android.importClass('android.content.Intent');
							var Settings = plus.android.importClass('android.provider.Settings');
							var intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
							main.startActivity(intent); // 打开系统设置GPS服务页面
						  } else {
							console.log('GPS功能已开启');
						}
					  }
				   });
				  return false
				  } else {
					console.log('GPS功能已开启');
					that.searchDevices()
					return true
				  }
				}
			},
			
			//搜索蓝牙
			searchDevices(){
				var that = this;
				that.unpairedList = [];	//未配对
				// that.pairedList = []; 	//已配对
				
				//取内存里面已配对的蓝牙
				// that.pairedList = uni.getStorageSync("pairedList");
				
				//打开蓝牙模块
				uni.openBluetoothAdapter({
					success(res) {
						console.log("蓝牙模块：",res);
						//获取本机蓝牙适配器状态
						uni.getBluetoothAdapterState({
							success: function(res) {
								console.log("蓝牙适配器状态：",res);
								if (res.available) {
									//开始搜寻附近的蓝牙外围设备
									uni.startBluetoothDevicesDiscovery({
										success(res) {
											var main = plus.android.runtimeMainActivity();
											var IntentFilter = plus.android.importClass('android.content.IntentFilter');
											var BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
											var BluetoothDevice = plus.android.importClass("android.bluetooth.BluetoothDevice");
											var BAdapter = BluetoothAdapter.getDefaultAdapter();
											
											if (BAdapter != null && !BAdapter.isEnabled()) {
											  let _intent = plus.android.importClass('android.content.Intent');
											  let intent = new _intent(blue_client.ACTION_REQUEST_ENABLE);
											  main.startActivityForResult(intent, 200);
											}
											
											uni.showLoading({
											  title: "开始搜索设备",
											})
											
											//获取本机蓝牙信息
											// var name = BAdapter.getName();
											// var address = BAdapter.getAddress();
											// console.log("本机蓝牙名称："+name+" 本机蓝牙地址："+address);
											
											var filter = new IntentFilter();
											var bdevice = new BluetoothDevice();
											BAdapter.startDiscovery(); //开启搜索  
											var receiver;
											receiver = plus.android.implements('io.dcloud.android.content.BroadcastReceiver', {onReceive: function(context, intent) { //实现onReceiver回调函数  
												plus.android.importClass(intent); //通过intent实例引入intent类，方便以后的‘.’操作
												if (intent.getAction() == "android.bluetooth.adapter.action.DISCOVERY_FINISHED") {
													main.unregisterReceiver(receiver); //取消监听
													//去重
													// for (let i = 0; i < that.unpairedList.length; i++) {
													// 	for (let j = i+1; j < that.unpairedList.length; j++) {
													// 		if(that.unpairedList[i].address == that.unpairedList[j].address){
													// 			that.unpairedList.splice(j,1);//去重
													// 			j--;
													// 		}
													// 	}
													// }
													// for (let i = 0; i < that.pairedList.length; i++) {
													// 	for (let j = i+1; j < that.pairedList.length; j++) {
													// 		if(that.pairedList[i].address == that.pairedList[j].address){
													// 			that.pairedList.splice(j,1);//去重
													// 			j--;
													// 		}
													// 	}
													// }
													console.log("搜索结束");
													console.log(that.unpairedList);
													// console.log(that.pairedList);
													//把已配对的蓝牙存内存
													// uni.setStorageSync("pairedList",that.pairedList);
													uni.hideLoading();
												} else {
													if (intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getBondState() === 10) {
														var y = 0;
														for (let x = 0; x < that.unpairedList.length; x++) {
															if(that.unpairedList[x].address == intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getAddress()){
																y++;
															}
														}
														if(y > 0){
															y = 0;
														}else{
															that.unpairedList.push({
																name: intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getName(),
																address: intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getAddress()
															})
														}
													}
													// else if (intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getBondState() === 12) {
													// 	var y = 0;
													// 	for (let x = 0; x < that.pairedList.length; x++) {
													// 		if(that.pairedList[x].address == intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getAddress()){
													// 			y++;
													// 		}
													// 	}
													// 	if(y > 0){
													// 		y = 0;
													// 	}else{
													// 		that.pairedList.push({
													// 			name: intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getName(),
													// 			address: intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE).getAddress(),
													// 			isSelected:'0'
													// 		})
													// 	}
													// }
												}
											}});
											filter.addAction(bdevice.ACTION_FOUND);
											filter.addAction(BAdapter.ACTION_DISCOVERY_STARTED);
											filter.addAction(BAdapter.ACTION_DISCOVERY_FINISHED);
											filter.addAction(BAdapter.ACTION_STATE_CHANGED);
											main.registerReceiver(receiver, filter); //注册监听
										}
									})
								}
							},
						})
					}
				})
			},
			
			//连接打印机
			createBLEConnection(mac_address){
				// mac_address为获取到蓝牙数据中的address字段
				if (!mac_address) {
				   mui.toast("请选择蓝牙打印机");
				   return;
				}
				
				var main = plus.android.runtimeMainActivity();
				var BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
				var BluetoothDevice = plus.android.importClass("android.bluetooth.BluetoothDevice");
				var UUID = plus.android.importClass("java.util.UUID");
				// var uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
				var uuid = UUID.fromString("00001105-0000-1000-8000-00805f9B34FB");
				var BAdapter = BluetoothAdapter.getDefaultAdapter();
				var device = BAdapter.getRemoteDevice(mac_address);
				plus.android.importClass(device);
				var bdevice = new BluetoothDevice();
				var that = this;
				//判断是否配对  
				if (device.getBondState() == bdevice.BOND_NONE) {  
					console.log("未配对蓝牙设备：" + device.getName() + '    ' + device.getAddress());  
					//参数如果跟取得的mac地址一样就配对  
					if (mac_address == device.getAddress()) {  
						// console.log("111")
						if (device.createBond()) { //配对命令.createBond() 
							console.log("配对成功")
							var cha = setInterval(function(){
								if (device.getBondState() == bdevice.BOND_BONDED) {  
									clearInterval(cha);
									//删除未配对蓝牙，添加到已配对
									for(var i=0;i<that.unpairedList.length;i++){
										if(that.unpairedList[i].address == mac_address){
											that.pairedList.push(that.unpairedList[i]);
											that.unpairedList.splice(i,1);
											break;
										}
									}
								}
							},1000)
						}
					}
				}
			},
		},
	}
</script>

<style>
	
	.yipeidui,.weipeidui{
		overflow: auto;
	}
	.anniu{
		width: 80px;
		height: 35px;
		line-height: 35px;
		border-radius: 10rpx;
		text-align: center;
		background-color: #8A2BCF;
		color: white;
		font-weight: bold;
		margin-left: 15px;
	}
	.anniu:active{
		background-color: #ebeb75 !important;
	}
	.lanya{
		padding: 16px 0 16px 15px;
		font-size: 18px;
		color: #5b5a5a;
	}
	.lanya:active{
		background-color: #dfdfdf;
	}
</style>
