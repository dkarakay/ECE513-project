/**
 * @fileoverview Handles user authentication status and logout functionality.
 * 
 * This script checks for a stored token in localStorage to determine if a user is logged in.
 * If a token is found, it makes an AJAX request to fetch the user's status.
 * Depending on the response, it updates the UI to show user information or authentication links.
 * It also provides a logout button functionality to clear the token and update the UI accordingly.
 */

$(document).ready(function () {
  // Retrieve the token from localStorage
  const token = window.localStorage.getItem("token");

  if (token) {
    // Make an AJAX request to get user status if token exists
    $.ajax({
      url: "/users/status",
      method: "GET",
      headers: { "x-auth": token },
      dataType: "json",
    })
      .done(function (data, textStatus, jqXHR) {
        // On success, update the UI with user email and show user info
        $("#userEmail")
          .text(`Welcome, ${data.email}`)
          .attr("href", "account.html");
        $("#authLinks").removeClass("show");
        $("#userInfo").addClass("show");
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        // On failure, log the error and show authentication links
        console.error("Error fetching user status:", errorThrown);
        $("#authLinks").addClass("show");
      });
  } else {
    // If no token, show authentication links
    $("#authLinks").addClass("show");
  }

  // Handle logout button click event
  $("#btnLogOut").click(function (event) {
    event.preventDefault();
    // Remove the token from localStorage and update the UI
    window.localStorage.removeItem("token");
    $("#userInfo").removeClass("show");
    $("#authLinks").addClass("show");
  });
});
