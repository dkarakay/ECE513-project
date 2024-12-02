$(function () {
  $("#btnLogOut").click(logout);

  $.ajax({
    url: "/users/status",
    method: "GET",
    headers: { "x-auth": window.localStorage.getItem("token") },
    dataType: "json",
  })
    .done(function (data, textStatus, jqXHR) {
      $("#rxData").html(JSON.stringify(data, null, 2));
      $("#welcomeMessage").html(`Welcome, ${data.email}`);
      $("#deviceId").html(`Device ID: ${data.device_id}`);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      window.location.replace("display.html");
    });
});

function updatePassword() {
    const currentPassword = $("#currentPassword").val();
    const newPassword = $("#newPassword").val();
    const confirmPassword = $("#confirmPassword").val();

    console.log(currentPassword, newPassword, confirmPassword);

    if (!currentPassword || !newPassword || !confirmPassword) {
      window.alert("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      window.alert("Passwords do not match.");
      return;
    }

    if (zxcvbn($('#newPassword').val()).score < 3) {
      window.alert("Password should be strong");
      return;
  }

    $.ajax({
      url: "/users/update-password",
      method: "POST",
      headers: { "x-auth": window.localStorage.getItem("token") },
      contentType: "application/json",
      data: JSON.stringify({
        currentPassword,
        newPassword
      }),
      dataType: "json",
    })
      .done(function (data) {
        $("#passwordUpdateStatus").html("Password updated successfully.");
      })
      .fail(function (jqXHR) {
        $("#passwordUpdateStatus").html("Failed to update password: " + jqXHR.responseText);
      });
}

$(function () {
  $('#btnUpdatePassword').click(updatePassword);
});

function logout() {
  localStorage.removeItem("token");
  window.location.replace("index.html");
}
