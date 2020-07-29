import * as amqp from 'amqp';

const RABBITMQ_PROTOCOL = ""

const config: amqp.ConnectionOptions = {
    host: "127.0.0.2",
    port: 5672,
    login: 'guest',
    password: 'guest',

}

const connection = amqp.createConnection(config);

// add this for better debuging
connection.on('error', function (e) {
    console.log("Error from amqp: ", e);
});

connection.on('connect', () => {
    console.log("conectado!!!")
    connection.queue('CLIENT_MANAGER', {

    }, (q) => {

    })

})

/*
connection.queue('CLIENT_MANAGER', (q) => {

})
*/
