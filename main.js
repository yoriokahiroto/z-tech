var autoGain = true;
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

    //LED部分
    const gpioAccess = await navigator.requestGPIOAccess();
    const ledRedPort = gpioAccess.ports.get(19); // LED の GPIO ポート番号
    const ledBluePort = gpioAccess.ports.get(20); // LED の GPIO ポート番号
    const ledGreenPort = gpioAccess.ports.get(21); // LED の GPIO ポート番号
    await ledRedPort.export("out"); // ポートを出力モードに設定
    await ledBluePort.export("out"); // ポートを出力モードに設定
    await ledGreenPort.export("out"); // ポートを出力モードに設定

    await ledRedPort.write(0);
    await ledBluePort.write(1);
    await ledGreenPort.write(1);

    //距離センサ部分
    var amg8833 = new AMG8833(port, 0x68); // 初期値 0x69 のモデルもあるので注意！
    await amg8833.init();

    //サーモグラフィ部分
    var sensor_unit = new GP2Y0E03(port, 0x40);
    await sensor_unit.init();

    while (1) {
      var count = 0;
      var sum1 = 0;
      var sum2 = 0;
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
          dmin = mins(d);
          dmaxmax = maxt(dmax); //最大値を取る
          dminmin = mint(dmin); //最小値を取る
          heatMap(tImage);

          //LEDが赤色に点灯
          await ledRedPort.write(0);
          await ledBluePort.write(1);
          await ledGreenPort.write(1);
          await sleep(100);
          sum1 = sum1 + dmaxmax;
          sum2 = sum2 + dminmin;
          count++;
        } else if (distance > 30) {
          valelem.innerHTML = "近づいてください";
          //LEDが赤色に点灯
          await ledRedPort.write(0);
          await ledBluePort.write(1);
          await ledGreenPort.write(1);
        } else if (distance <= 10 && distance >= 3) {
          var spanedSec = 0;
          //1.5秒計測
          while (distance <= 10 && distance >= 3 && spanedSec <= 1500) {
            spanedSec = spanedSec + 100;
            valelem.innerHTML = spanedSec * 0.001 + "[s]経過";
            distance = await sensor_unit.read();

            //LEDが青色に点灯
            await ledRedPort.write(1);
            await ledBluePort.write(0);
            await ledGreenPort.write(1);
            await sleep(80); //このwhileの処理時間を考慮
            if (spanedSec >= 1500) {
              valelem.innerHTML = "OK!";
              new Audio(
                "data:audio/wav;base64,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"
              ).play();
              // クリップボードにあるbase64文字列を貼り付けます
              var base64 =
                "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";

              // datauri scheme 形式にして Audio オブジェクトを生成します
              var sound = new Audio("data:audio/wav;base64," + base64);

              // 音を鳴らします
              sound.play();
              break end;
            }
          }
        } else {
          valelem.innerHTML = "離れてください"; //3cm未満の場合
          //LEDが赤色に点灯
          await ledRedPort.write(0);
          await ledBluePort.write(1);
          await ledGreenPort.write(1);
        }
        await sleep(100);
      }
      var tem = sum1 / count; //体温の平均化
      var min = sum2 / count;
      var taion = -0.53648868 * min + 17.5870766 + tem;
      body.innerHTML = taion.toFixed(1) + "℃"; //小数点１桁までの体温表示
      document.getElementById("postTemp").value = taion.toFixed(1);
      var data = $("form").serializeArray();
      submitForm(data);

      //LEDが赤色に点灯
      await ledRedPort.write(0);
      await ledBluePort.write(1);
      await ledGreenPort.write(1);

      // 手が離れるまで待機→最初に戻る
      while (distance < 10 && distance != null) {
        distance = await sensor_unit.read();
        await sleep(500);
      }
    }
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

function mins(d) {
  //2次元配列の中か最大値を取り出して１次元配列にする関数
  return d.map(Function.apply.bind(Math.min, null));
}
function mint(d) {
  //１次元配列の中から最大の要素を取り出す関数
  return Math.min.apply(null, d);
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
