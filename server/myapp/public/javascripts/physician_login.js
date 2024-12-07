// javascripts/physician_login.js

$(document).ready(function () {
  function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  }

  function physicianLogin(event) {
    event.preventDefault(); // Prevent default form submission

    // Data validation
    const email = $("#physicianLoginEmail").val().trim();
    const password = $("#physicianLoginPassword").val();

    if (email === "") {
      alert("Email field cannot be empty!");
      return;
    }
    if (!validateEmail(email)) {
      alert("Invalid email format!");
      return;
    }
    if (password === "") {
      alert("Password field cannot be empty!");
      return;
    }

    const txdata = {
      email: email,
      password: password,
    };

    $.ajax({
      url: "/physicians/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(txdata),
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        $("#physicianLoginRxData").html(
          `<pre>${JSON.stringify(data, null, 2)}</pre>`
        );
        if (data.success && data.token) {
          // Store token in localStorage
          localStorage.setItem("physicianToken", data.token);
          // Redirect to dashboard
          window.location.href = "physician_dashboard.html";
        } else {
          alert("Login failed. Please check your credentials.");
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 404) {
          $("#physicianLoginRxData").html("Server could not be reached!!!");
        } else {
          $("#physicianLoginRxData").html(
            `<pre>${JSON.stringify(jqXHR.responseJSON, null, 2)}</pre>`
          );
        }
      });
  }

  $("#physicianLoginForm").submit(physicianLogin);
});
