import amqplib from "amqplib/callback_api";

const QUEUE = "auth_notification_queue";

let channel;

amqplib.connect(process.env.RABBITMQ_URL, (error, connection) => {
    if (error) {
        throw error;
    }

    connection.createChannel((error, ch) => {
        if (error) {
            throw error;
        }

        channel = ch;

        channel.assertQueue(QUEUE, {
            durable: true
        });
    });
});

export function sendAuthNotification(message) {
    if (!channel) {
        throw new Error("RabbitMQ channel is not ready");
    }

    channel.sendToQueue(
        QUEUE,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
    );
}