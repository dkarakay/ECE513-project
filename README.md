# ECE513 Project

## Contributors

- Deniz Karakay
- Serhat Furkan Bozkurt
- Hasan Umut Suluhan

## Milestone Demo Video

[![Watch the video](https://img.youtube.com/vi/vwafzZx3cuQ/0.jpg)](https://www.youtube.com/watch?v=vwafzZx3cuQ)

## Server [Link](http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/)


### Running Server

In order to run the server on current terminal, run

```sh
sh run_server.sh
```

continuously, run

```sh
sh run_server_nonstop.sh
```

to kill,
```sh
sh kill_server.sh
```


## Endpoints


| **Method** | **Endpoint**                             | **Description**                                          |
| ---------- | ---------------------------------------- | -------------------------------------------------------- |
| POST       | `/sensor`                                | Add a new sensor reading.                                |
| GET        | `/sensor`                                | Get all sensor readings for the logged-in user's devices.|
| GET        | `/sensor/all`                            | Get all sensor readings (for debugging purposes).        |
| GET        | `/sensor/latest`                         | Get the latest sensor reading for the logged-in user's devices. |
| GET        | `/sensor/device/:device_id`              | Get sensor readings by device ID.                        |
| GET        | `/reset`                                 | Reset all sensor readings and user accounts.             |
| POST       | `/users/register`                        | Register a user to the database.                         |
| POST       | `/users/login`                           | Log in to a user account.                                |
| GET        | `/users/status`                          | Get the status of the logged-in user.                    |
| POST       | `/users/update-password`                 | Update the user's password.                              |
| POST       | `/users/update-measurement-settings`     | Update the measurement settings for a device.            |
| GET        | `/users/measurement-settings/:device_id` | Get the measurement settings for a device.               |
| GET        | `/users/me`                              | Get the current user's details.                          |
| POST       | `/users/add-device`                      | Add a new device for the user.                           |
| DELETE     | `/users/delete-device/:device_id`        | Delete a device for the user.                            |
| GET        | `/users`                                 | Get all users.                                           |
| GET        | `/users/device/:device_id`               | Get device details by device ID.                         |

### Sample Request

`POST /sensor`  Add a new sensor reading.  

```bash
curl -X POST http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/sensor \
-H "Content-Type: application/json" \
-H "x-api-key: 3786bc99-d8f4-428c-80a3-33fd7afaf5de" \
-d '{"device_id":"xxxx","data":{"bpm": 65, "spo2": 75}}'
```

## Graph

1. Open `http://ec2-3-143-111-57.us-east-2.compute.amazonaws.com:3000/graph.html` in your web browser.
2. You can choose the aggregation level for sensor data. Available options:

- **Every 30 Minutes**: Aggregates data every 30 minutes.
- **Daily**: Aggregates data on a daily basis.
- **Weekly**: Aggregates data on a weekly basis.

## Particle

`particle/`
