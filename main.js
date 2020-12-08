var autoGain = false;
var tMax, tMin;

initTable();

var tMaxTxt = document.getElementById("tMaxTxt");
var tMinTxt = document.getElementById("tMinTxt");
var tMaxUI = document.getElementById("tMaxUI");
var tMinUI = document.getElementById("tMinUI");

main();

tMaxTxt.innerText = tMax;
tMinTxt.innerText = tMin;
tMaxUI.value = tMax;
tMinUI.value = tMin;

async function main() {
  var valelem = document.getElementById("distance");
  var body = document.getElementById("temperature");
  try {
    var i2cAccess = await navigator.requestI2CAccess(); //1回のみ宣言
    var port = i2cAccess.ports.get(1); //1回のみ宣言

    //距離センサ部分
    var amg8833 = new AMG8833(port, 0x68); // 初期値 0x69 のモデルもあるので注意！
    await amg8833.init();

    //サーモグラフィ部分
    var sensor_unit = new GP2Y0E03(port, 0x40);
    await sensor_unit.init();
    var count = 0;
    var sum = 0;
    var d = [8][8];
    var dmax = [];
    var dmaxmax;

    end: while (1) {
      var distance = await sensor_unit.read();

      if (distance <= 30 && distance >= 10) {
        valelem.innerHTML = "Distance:" + distance + "cm";
        var tImage = await amg8833.readData();
        d = tImage; //tImageを２次元配列dに格納
        dmax = maxs(d); //2→1(次元配列)
        dmaxmax = maxt(dmax); //最大値を取る
        heatMap(tImage);
        console.log(tImage);
        await sleep(100);
        sum = sum + dmaxmax;
        count++;
      } else if (distance > 30) {
        valelem.innerHTML = "近づいてください";
      } else if (distance <= 10 && distance >= 3) {
        var spanedSec = 0;
        //2秒計測
        while (distance <= 10 && distance >= 3 && spanedSec <= 2000) {
          spanedSec = spanedSec + 100;
          valelem.innerHTML = spanedSec * 0.001 + "[s]経過";
          distance = await sensor_unit.read();
          await sleep(80); //このwhileの処理時間を考慮
          if (spanedSec > 2000) {
            valelem.innerHTML = "OK!";
            break end;
          }
        }
      } else valelem.innerHTML = "離れてください"; //3cm未満の場合
      await sleep(100);
    }
    var tem = sum / count;
    body.innerHTML = tem.toFixed(1) + "℃";
    var promise = navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
  } catch (err) {
    console.log("READ ERROR:" + err);
  }
}

function maxs(d) {
  //2次元配列の中か最大値を取り出して１次元配列にする関数
  return d.map(Function.apply.bind(Math.max, null));
}
function maxt(d) {
  //１次元配列の中から最大の要素を取り出す関数
  return Math.max.apply(null, d);
}

function initTable() {
  var tbl = document.getElementById("tImg");
  for (var i = 0; i < 8; i++) {
    var tr = document.createElement("tr");
    for (var j = 0; j < 8; j++) {
      var td = document.createElement("td");
      td.id = "img" + j + "_" + i;
      td.innerText = "";
      td.style.backgroundColor = "#00A000";
      tr.appendChild(td);
    }
    tbl.appendChild(tr);
  }
}

function heatMap(tImage) {
  if (autoGain) {
    calcGain(tImage);
  }
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      var tId = "img" + j + "_" + i;
      var td = document.getElementById(tId);
      //			console.log(tId,td);
      var rgb = hsvToRgb(temperature2hue(tImage[i][j]), 1, 1);
      var colorCode = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      //			var colorCode = "#"+rgb[0].toString(16)+rgb[1].toString(16)+rgb[2].toString(16)
      td.style.backgroundColor = colorCode;
      //			console.log("colorCode:",colorCode);
    }
  }
}

function calcGain(tImage) {
  var min = 200;
  var max = -200;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      var temp = tImage[i][j];
      //			console.log("temp:",temp);
      if (min > temp) {
        min = temp;
      }
      if (max < temp) {
        max = temp;
      }
    }
  }
  tMax = max;
  tMin = min;
  tMaxTxt.innerText = tMax;
  tMinTxt.innerText = tMin;
  //	console.log("autoRange:",tMax,tMin);
}

// in celsius
var tMax = 40;
var tMin = 20;

var hMax = 0;
var hMin = 270;
function temperature2hue(temp) {
  if (temp > tMax) {
    return hMax;
  } else if (temp < tMin) {
    return hMin;
  } else {
    var ans = ((hMax - hMin) / (tMax - tMin)) * (temp - tMin) + hMin;
    return ans;
  }
}

// from https://qiita.com/hachisukansw/items/633d1bf6baf008e82847
function hsvToRgb(H, S, V) {
  //https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV

  var C = V * S;
  var Hp = H / 60;
  var X = C * (1 - Math.abs((Hp % 2) - 1));

  var R, G, B;
  // prettier-ignore
  {
    if (0 <= Hp && Hp < 1) {[R,G,B]=[C,X,0]};
    if (1 <= Hp && Hp < 2) {[R,G,B]=[X,C,0]};
    if (2 <= Hp && Hp < 3) {[R,G,B]=[0,C,X]};
    if (3 <= Hp && Hp < 4) {[R,G,B]=[0,X,C]};
    if (4 <= Hp && Hp < 5) {[R,G,B]=[X,0,C]};
    if (5 <= Hp && Hp < 6) {[R,G,B]=[C,0,X]};
  }

  var m = V - C;
  [R, G, B] = [R + m, G + m, B + m];

  R = Math.floor(R * 255);
  G = Math.floor(G * 255);
  B = Math.floor(B * 255);

  return [R, G, B];
}

function changeGainMode(event) {
  console.log(event.target.value);
  if (event.target.value == "auto") {
    autoGain = true;
    manualGainRadio.checked = false;
    autoGainRadio.checked = true;
  } else {
    autoGain = false;
    tMax = Number(tMaxUI.value);
    tMin = Number(tMinUI.value);
    tMaxTxt.innerText = tMax;
    tMinTxt.innerText = tMin;
    manualGainRadio.checked = true;
    autoGainRadio.checked = false;
  }
}
