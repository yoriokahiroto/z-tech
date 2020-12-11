function submitForm(data) {
  $("#answer").text("通信中...");
  $.ajax({
    url: "https://j2.jwcc.io",
    type: "POST",
    dataType: "json",
    data: data,
    timeout: 5000
  })
    .done(function (data) {
      alert("データの送信が完了しました。");
      console.log(data);
      $("#answer").html(
        '<span style="color: red;">あなたの体温は' + data + "です</span>"
      );
    })
    .fail(function () {
      alert("データの通信に失敗しました。");
    });
}
