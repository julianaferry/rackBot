
import "./styles.css";

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

// buttonArray = document.querySelectorAll('botStyle');

// for (let i = 0; i < buttonArray.length; i++) {

//   h1.innerText = 'Hello World!'
//   // Append it to the body
//   document.body.append(h1)
// }




