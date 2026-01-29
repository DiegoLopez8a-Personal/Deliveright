/**
 * @fileoverview Home Page - Main Entry Point
 *
 * The landing page for the application. It acts as a router/controller that
 * determines which view to show based on the user's account status.
 *
 * Logic Flow:
 * 1. Shows LoadingSkeleton while fetching user data
 * 2. If user exists and has an address -> Shows Dashboard
 * 3. If user does not exist -> Shows SignUpForm
 *
 * @module pages/index
 * @requires react
 * @requires ../components
 * @requires ../hooks
 */

import React, {useEffect, useState} from "react";
import SignUpForm from "../components/SignUpForm.jsx";
import Dashboard from "../components/Dashboard.jsx";
import LoadingSkeleton from "../components/Loading.jsx";
import {useAppQuery} from "../hooks/index.js";
import { Toast, useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";

/**
 * Home Page Component
 *
 * Orchestrates the main application flow.
 * Fetches store data to determine if the user is new or returning.
 *
 * @component
 * @returns {JSX.Element} Main application view
 */
export default function HomePage() {
    const emptyToastProps = { content: null };
    const [toastProps, setToastProps] = useState(emptyToastProps);
    const toastMarkup = toastProps.content && (
        <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
    );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const app = useAppBridge();
      const token = await getSessionToken(app);   
      const response = await fetch("/api/store", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
   
      const data = await response.json();
      console.log("Data:", data);
    };
   
    fetchData();
  }, []);
    const {
        data: user,
    } = useAppQuery({
        url: "/api/store",
        reactQueryOptions: {
            onSettled: () => {
                setLoading(false);
            },
        },
});


  return (
      <>
        {loading ? (
            <LoadingSkeleton/>
        ) : user && user.address ? (
            <Dashboard user={user} setToastProps={setToastProps}/>
        ) : (
            <SignUpForm setToastProps={setToastProps}/>
        )}
            {toastMarkup}
      </>
  );
}