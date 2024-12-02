function login() {
    let txdata = {
        email: $('#email').val(),
        password: $('#password').val()
    };
    $.ajax({
        url: '/users/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(txdata),
        dataType: 'json'
    })
    .done(function (data, textStatus, jqXHR) {
        localStorage.setItem("token", data.token);
        window.location.replace("account.html");
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
            window.alert("Invalid email or password");
            return;
        }
        $('#rxData').html(JSON.stringify(jqXHR, null, 2));
    });
}

$(function () {
    $('#btnLogIn').click(login);
});

