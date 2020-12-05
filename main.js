var autoGain = false;
var tMax, tMin; //tmax:最高温度, tmin:最低温度

initTable();

//document.getElementById("ID属性")　→ 指定したID属性をもつHTML要素を取得する
var tMaxTxt = document.getElementById("tMaxTxt");
var tMinTxt = document.getElementById("tMinTxt");
var tMaxUI = document.getElementById("tMaxUI");
var tMinUI = document.getElementById("tMinUI");

main();

//innerText → オブジェクト内の「文字列」のみ
//value → 送信する値やリストの項目番号を設定できる属性
tMaxTxt.innerText = tMax;
tMinTxt.innerText = tMin;
tMaxUI.value = tMax;
tMinUI.value = tMin;

async function main() {
  //エラーハンドリング：tryのブロック内でエラーが発生するとcatchブロックに処理が飛ぶ
  try {
    //await : async function内でPromiseの結果が返されるまで待機する(処理を一時停止する)
    //navigator : ウェブブラウザの情報を取得できるオブジェクト
    var i2cAccess = await navigator.requestI2CAccess();
    var port = i2cAccess.ports.get(1); //i2cAcessのポート1に接続する
    var amg8833 = new AMG8833(port, 0x68); // 初期値 0x69 のモデルもあるので注意！]
    var sensor_unit = new GP2Y0E03(port, 0x40);
    var max = document.getElementById("max");
    var last = document.getElementById("last");
    var csv2 = document.getElementById("csv1");
    var space = document.getElementById("space");
    var valelem = document.getElementById("distance");
    var count = 0;
    var d = [8][8];
    var csv = [];
    const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

    await amg8833.init(); //変数amg8833を初期化
    await sensor_unit.init(); //変数sensor_unitを初期化
    var sum = 0;
    /*var testcsv = [
      [1, 31],
      [2, 30],
      [3, 30.44],
      [4, 30.79],
      [5, 31.99]
    ];*/
    while (1) {
      var tImage = await amg8833.readData(); //amg8833の値を読み込む
      var distance = await sensor_unit.read(); //sensor_unitの値を読み込む
      console.log(tImage);
      console.log(distance);
      d = tImage; //tImageを２次元配列に格納
      var dmax = [];
      var dmin = [];
      if (distance <= 30 && distance <= 10) {
        valelem.innerHTML = "Distance:" + distance + "cm";
        dmax = maxs(d);
        dmin = mins(d);
        var dmaxmax = maxt(dmax) + 8; //全ピクセル(64ピクセル)中の最高温度(dmaxmax)
        var dminmin = mint(dmin); //全ピクセル(64ピクセル)中の最低温度(dminmin)
        csv.push(dmaxmax);
        max.innerText = dmaxmax + ","; //HTML内で表示
        csv2.innerText = csv; //csvファイルを表示する関数
        //space.innerText = ",";

        heatMap(tImage);
        console.log(tImage);
        await sleep(100);
        sum = sum + dmaxmax;
        count++;
      } else if (distance >= 30) {
        valelem.innerHTML = "もう少し近づいてください";
      } else break;
    }
    var last1 = sum / count;
    last.innerText = last1; //HTML内で関数
    //js2csv(csv);
    count = 0;
    while (count <= 20 && distance <= 10) {
      //0.1 × 20 = 2[s]経過するまでループ
      //センサと手との距離が10cm以内にキープしている状態
      distance = await sensor_unit.read();
      await sleep(100); //0.1[s]待機
      count++;
    }

    //平均化した体温(last1)と外部の温度の情報をスマホ(docker)に渡す
    //スマホ(docker)に来訪した旨と上の情報の通知が来る
    //カメラとマイクを介して通話 → となるとスマホ(docker)側からの音声はどういった方法で送るのか？
    //さらに夜の場合も想定して、ライト(LED)もつける必要がある
  } catch (error) {
    console.error("error", error);
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
  //2次元配列の中から最小値を取り出して1次元配列にする関数
  return d.map(Function.apply.bind(null, Math.min));
}

function mint(d) {
  //１次元配列の中から最小の要素を取り出す関数
  return Math.min.apply(null, d);
}

/*
//CSVファイルを作る関数
function js2csv(testcsv) {
  var fs = require("fs");
  var formatCSV = "";

  exportCSV(testcsv);

  // 配列をcsvで保存するfunction
  function exportCSV(content) {
    for (var i = 0; i < content.length; i++) {
      var value = content[i];

      for (var j = 0; j < value.length; j++) {
        var innerValue = value[j] === null ? "" : value[j].toString();
        var result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
        if (j > 0) formatCSV += ",";
        formatCSV += result;
      }
      formatCSV += "\n";
    }
    fs.writeFile("formList.csv", formatCSV, "utf8", function (err) {
      if (err) {
        console.log("保存できませんでした");
      } else {
        console.log("保存できました");
      }
    });
  }
}
*/

function initTable() {
  var tbl = document.getElementById("tImg");
  for (var i = 0; i < 8; i++) {
    //createElement : HTML要素(tr)を動的に生成する
    var tr = document.createElement("tr");
    for (var j = 0; j < 8; j++) {
      //createElement : HTML要素(td)を動的に生成する
      var td = document.createElement("td");
      td.id = "img" + j + "_" + i;
      td.innerText = "";
      td.style.backgroundColor = "#00A000"; //背景色を緑に設定
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
      td.style.backgroundColor = colorCode; //背景色を指定
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

/*function distance() {
  var valelem = document.getElementById("distance");
  try {
    var i2cAccess = await navigator.requestI2CAccess();
    var port = i2cAccess.ports.get(1);
    var sensor_unit = new GP2Y0E03(port, 0x40);
    await sensor_unit.init(); //初期化

    while (1) {
      try {
        var distance = await sensor_unit.read();  //データ読み込み
        if (distance　<= 30cm) {
          valelem.innerHTML = "Distance:" + distance + "cm";
        } else {
          valelem.innerHTML = "もう少し近づいてください";
        }
      } catch (err) {
        console.log("READ ERROR:" + err);
      }
      await sleep(500);
    }
  } catch (err) {
    console.log("GP2Y0E03 init error");
  }
}
*/
