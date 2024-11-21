$(document).ready(function () {
  const token = window.localStorage.getItem("token");
  if (token) {
    $.ajax({
      url: "/users/status",
      method: "GET",
      headers: { "x-auth": token },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        $("#userEmail")
          .text(`Welcome, ${data.email}`)
          .attr("href", "account.html");
        $("#authLinks").removeClass("show");
        $("#userInfo").addClass("show");
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error("Error fetching user status:", errorThrown);
        $("#authLinks").addClass("show");
      });
  } else {
    $("#authLinks").addClass("show");
  }

  $("#btnLogOut").click(function (event) {
    event.preventDefault();
    window.localStorage.removeItem("token");
    $("#userInfo").removeClass("show");
    $("#authLinks").addClass("show");
  });
});
