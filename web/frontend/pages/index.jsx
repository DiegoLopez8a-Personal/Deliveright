import React, {useEffect, useState} from "react";
import SignUpForm from "../components/SignUpForm.jsx";
import Dashboard from "../components/Dashboard.jsx";
import LoadingSkeleton from "../components/Loading.jsx";
import {useAppQuery} from "../hooks/index.js";
import { Toast, useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";

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