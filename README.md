# ECE513 Project

## Contributors

- Deniz Karakay
- Serhat Furkan Bozkurt
- Hasan Umut Suluhan

## Milestone Demo Video

[![Watch the video](https://img.youtube.com/vi/vwafzZx3cuQ/0.jpg)](https://www.youtube.com/watch?v=vwafzZx3cuQ)

## Server [Link](http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/)

`server/`

### Running Server

In order to run the server on current terminal, run

```sh
sh run_server.sh
```

In order to run the server continuously, run

```sh
sh run_server_nonstop.sh
```

| **Method** | **Endpoint**                             | **Description**                                          | **Example**                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST       | `/sensor`                                | Add a new sensor reading.                                | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor -H "Content-Type: application/json" \ -H "x-api-key: 3786bc99-d8f4-428c-80a3-33fd7afaf5de" \ -d '{"device_id":"xxxx","data":{"bpm": 65, "spo2": 75}}'`                        |
| GET        | `/sensor`                                | Get all sensor readings for the logged-in user's devices.| `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor -H "x-auth: <token>"`                                                                                                                                                          |
| GET        | `/sensor/all`                            | Get all sensor readings (for debugging purposes).        | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/all`                                                                                                                                                                           |
| GET        | `/sensor/latest`                         | Get the latest sensor reading for the logged-in user's devices. | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/latest -H "x-auth: <token>"`                                                                                                                                                    |
| GET        | `/sensor/device/:device_id`              | Get sensor readings by device ID.                        | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor/device/xxxx`                                                                                                                                                                    |
| GET        | `/reset`                                 | Reset all sensor readings and user accounts.             | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/reset`                                                                                                                                                                                |
| POST       | `/users/register`                        | Register a user to the database.                         | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/register -H "Content-Type: application/json" -d '{"email":"xxxx","password":"xxxx","device_id":"xxxx"}'`                                                                       |
| POST       | `/users/login`                           | Log in to a user account.                                | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/login -H "Content-Type: application/json" -d '{"email":"xxxx","password":"xxxx"}'`                                                                                             |
| GET        | `/users/status`                          | Get the status of the logged-in user.                    | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/status -H "x-auth: <token>"`                                                                                                                                                    |
| POST       | `/users/update-password`                 | Update the user's password.                              | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/update-password -H "Content-Type: application/json" -H "x-auth: <token>" -d '{"currentPassword":"xxxx","newPassword":"xxxx"}'`                                                 |
| POST       | `/users/update-measurement-settings`     | Update the measurement settings for a device.            | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/update-measurement-settings -H "Content-Type: application/json" -H "x-auth: <token>" -d '{"device_id":"xxxx","measurementInterval":30,"startTime":"06:00","endTime":"22:00"}'` |
| GET        | `/users/measurement-settings/:device_id` | Get the measurement settings for a device.               | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/measurement-settings/xxxx -H "x-auth: <token>"`                                                                                                                                 |
| GET        | `/users/me`                              | Get the current user's details.                          | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/me -H "x-auth: <token>"`                                                                                                                                                        |
| POST       | `/users/add-device`                      | Add a new device for the user.                           | `curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/add-device -H "Content-Type: application/json" -H "x-auth: <token>" -d '{"device_id":"xxxx","measurementInterval":30,"startTime":"06:00","endTime":"22:00"}'`                  |
| DELETE     | `/users/delete-device/:device_id`        | Delete a device for the user.                            | `curl -X DELETE http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/delete-device/xxxx -H "x-auth: <token>"`                                                                                                                                     |
| GET        | `/users`                                 | Get all users.                                           | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users`                                                                                                                                                                                |
| GET        | `/users/device/:device_id`               | Get device details by device ID.                         | `curl -X GET http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/users/device/xxxx`                                                                                                                                                                    |

|

## Graph

1. Open `http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/graph.html` in your web browser.
2. You can choose the aggregation level for sensor data. Available options:

- **Every 30 Minutes**: Aggregates data every 30 minutes.
- **Daily**: Aggregates data on a daily basis.
- **Weekly**: Aggregates data on a weekly basis.

## Particle

`particle/`
