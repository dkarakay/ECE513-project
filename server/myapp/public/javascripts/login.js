/**
 * Handles the login process by sending user credentials to the server.
 * On successful login, stores the received token in local storage and redirects to the account page.
 * On failure, displays an appropriate error message.
 */
function login() {
    // Create an object with the email and password from the input fields
    let txdata = {
        email: $('#email').val(),
        password: $('#password').val()
    };

    // Send an AJAX POST request to the server with the user credentials
    $.ajax({
        url: '/users/login', // URL to send the request to
        method: 'POST', // HTTP method to use
        contentType: 'application/json', // Data type being sent
        data: JSON.stringify(txdata), // Convert the txdata object to a JSON string
        dataType: 'json' // Expected data type of the response
    })
    .done(function (data, textStatus, jqXHR) {
        // On success, store the received token in local storage
        localStorage.setItem("token", data.token);
        // Redirect to the account page
        window.location.replace("account.html");
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        // If the login fails with a 401 status, alert the user
        if (jqXHR.status === 401) {
            window.alert("Invalid email or password");
            return;
        }
        // Display the error details in the rxData element
        $('#rxData').html(JSON.stringify(jqXHR, null, 2));
    });
}

$(function () {
    $('#btnLogIn').click(login);
});

