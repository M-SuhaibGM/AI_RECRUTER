import React from "react";
import DashboardProvider from "./provider";
function DashboardLayout({ children }) {
  return (
    <div>
      <DashboardProvider>
        <div className="p-10  mt-15 ">{children}</div>
      </DashboardProvider>
    </div>
  );
}

export default DashboardLayout;
