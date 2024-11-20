
function signup() {
    // data validation
    if ($('#email').val() === "") {
        window.alert("invalid email!");
        return;
    }
    if ($('#password').val() === "") {
        window.alert("invalid password");
        return;
    }
    if ($('#device_id').val() === "") {
        window.alert("invalid device id");
        return;
    }
    let txdata = {
        email: $('#email').val(),
        password: $('#password').val(),
        device_id: $('#device_id').val()
    };
    $.ajax({
        url: '/users/register',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(txdata),
        dataType: 'json'
    })
    .done(function (data, textStatus, jqXHR) {
        $('#rxData').html(JSON.stringify(data, null, 2));
        if (data.success) {
            // after 1 second, move to "login.html"
            setTimeout(function(){
                window.location = "login.html";
            }, 1000);
        }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 404) {
            $('#rxData').html("Server could not be reached!!!");
        }
        else $('#rxData').html(JSON.stringify(jqXHR, null, 2));
    });
}

$(function () {
    $('#btnRegister').click(signup);
});
