// javascripts/physician_register.js

$(document).ready(function () {
  const strengthLevels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthClasses = ["weak", "fair", "good", "strong", "very-strong"];

  $("#physicianPassword").on("input", function () {
    const password = $(this).val();
    const result = zxcvbn(password);

    console.log(result);

    if (result.score !== undefined) {
      const strengthText = `${strengthLevels[result.score]} password`;
      $("#physicianStrength").text(strengthText);

      // Remove all strength classes
      $("#physicianStrength").removeClass(strengthClasses.join(" "));

      // Add the appropriate strength class
      $("#physicianStrength").addClass(strengthClasses[result.score]);
    }
  });

  function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  }

  function physicianSignup(event) {
    event.preventDefault(); // Prevent default form submission

    // Data validation
    const email = $("#physicianEmail").val().trim();
    const password = $("#physicianPassword").val();

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
    if (zxcvbn(password).score < 3) {
      alert("Password should be at least Good strength!");
      return;
    }

    const txdata = {
      email: email,
      password: password,
    };

    $.ajax({
      url: "/physicians/register",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(txdata),
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        $("#physicianRxData").html(
          `<pre>${JSON.stringify(data, null, 2)}</pre>`
        );
        if (data.success) {
          // Redirect to physician login after 1 second
          setTimeout(function () {
            window.location = "physician-login.html"; // Ensure this page exists
          }, 1000);
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 404) {
          $("#physicianRxData").html("Server could not be reached!!!");
        } else {
          $("#physicianRxData").html(
            `<pre>${JSON.stringify(jqXHR.responseJSON, null, 2)}</pre>`
          );
        }
      });
  }

  $("#physicianRegisterForm").submit(physicianSignup);
});
