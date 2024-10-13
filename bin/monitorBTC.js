const axios = require('axios');
const notifier = require('node-notifier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const bitcoinAddresses = process.env.BTC_DIRS.split(',');
const apiBaseUrl = 'https://api.blockcypher.com/v1/btc/main/addrs/';

const txCountDir = path.join(__dirname + "/..", 'tx_counts');



if (!fs.existsSync(txCountDir)) {
    fs.mkdirSync(txCountDir);
}

// Función para obtener el número de transacciones desde la API
async function getTransactionCount(address) {
    try {
        const response = await axios.get(`${apiBaseUrl}${address}`);
        if (response.status === 200) {
            return response.data.final_n_tx;  // El número de transacciones confirmadas
        } else {
            console.error(`Error al consultar la API: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error(`Error al conectarse a la API: ${error}`);
        return null;
    }
}

// Función para leer el último número de transacciones para una dirección
function loadLastTxCount(address) {
    const filePath = path.join(txCountDir, `${address}.txt`);
    if (fs.existsSync(filePath)) {
        return parseInt(fs.readFileSync(filePath, 'utf8').trim(), 10);
    }
    return 0;
}

// Función para guardar el número actual de transacciones para una dirección
function saveLastTxCount(address, count) {
    const filePath = path.join(txCountDir, `${address}.txt`);
    fs.writeFileSync(filePath, count.toString());
}

// Función para enviar una notificación de escritorio en Ubuntu
function sendNotification(address, newTxs) {
    notifier.notify({
        title: `Ingreso de Bitcoin (${address})`,
        message: `Has recibido ${newTxs} nueva(s) transacción(es).`,
        sound: true,
    });
}

// Función principal para monitorear las transacciones de múltiples direcciones
async function monitorTransactions() {
    var novedades = false;
    for (const address of bitcoinAddresses) {
        const lastTxCount = loadLastTxCount(address);
        const currentTxCount = await getTransactionCount(address);

        if (currentTxCount !== null) {
            if (currentTxCount > lastTxCount) {
                const newTxs = currentTxCount - lastTxCount;
                sendNotification(address, newTxs);
                saveLastTxCount(address, currentTxCount);
                novedades = true;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    if (!novedades) {
        notifier.notify({
            title: "Sin novedades",
            message: "No hay ingresos de BTC hoy.",
            sound: true,
        });
    }
}

setInterval(monitorTransactions, 43200000);

monitorTransactions();