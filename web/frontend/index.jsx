/**
 * @fileoverview Frontend Entry Point
 *
 * This file mounts the React application to the DOM.
 * It is the starting point for the client-side bundle.
 *
 * @module frontend/index
 * @requires react-dom
 * @requires ./App
 */

import ReactDOM from "react-dom";

import App from "./App";

ReactDOM.render(<App />, document.getElementById("app"));
