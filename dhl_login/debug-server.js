// Debug version of the server to catch errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

try {
    console.log('Starting debug server...');
    require('./app.js');
} catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
}
