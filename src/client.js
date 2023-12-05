/* eslint-env browser */
/* global PARTYKIT_HOST */

import "./styles.css";

import PartySocket from "partysocket";

let pingInterval;

/** @type {HTMLDivElement} - The DOM element to append all messages we get */
const output = document.getElementById("app");

/**
 * Helper function to add a new line to the DOM
 * @param {string} text - The text to be added
 */
function add(text) {
  output.appendChild(document.createTextNode(text));
  output.appendChild(document.createElement("br"));
}


/**
 * A PartySocket is like a WebSocket, but with more features.
 * It handles reconnection logic, buffering messages while it's offline, etc.
 * @type {PartySocket} - The connection object
 */
const conn = new PartySocket({
  host: PARTYKIT_HOST,
  room: "my-new-room",
});

/**
 * Event listener to handle received messages.
 * @param {Event} event - The message event
 */
conn.addEventListener("message", function (event) {
  add(`Received -> ${event.data}`);
});

/**
 * Event listener for when the connection opens.
 */

const getBot1 = document.getElementById('bot1')
getBot1.addEventListener('click', () => {

  pingInterval = setTimeout(function () {
    conn.addEventListener("message", function (event) {
        add(`Forward -> ${event.data}`);
      });

    add('Forward');
   
  }, 900);

});

const getBot2 = document.getElementById('bot2')
getBot2.addEventListener('click', () => {

  pingInterval = setTimeout(function () {

    add('Backward');
   
  }, 500);

});
const getBot3 = document.getElementById('bot3')
getBot3.addEventListener('click', () => {

  pingInterval = setTimeout(function () {

    add('Right');
   
  }, 500);

});

const getBot4 = document.getElementById('bot4')
getBot4.addEventListener('click', () => {

  pingInterval = setTimeout(function () {

    add('Left');
   
  }, 500);

});

getBot2.removeEventListener()
getBot3.removeEventListener()






