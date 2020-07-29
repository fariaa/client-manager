import * as Amqp from "amqp-ts";

/*
    host: "127.0.0.2",
    port: 5672,
    login: 'guest',
    password: 'guest',

*/

const connection = new Amqp.Connection("amqp://127.0.0.2");
//var exchange = connection.declareExchange("ExchangeName");
export const queue = connection.declareQueue("CLIENT_MANAGER");

