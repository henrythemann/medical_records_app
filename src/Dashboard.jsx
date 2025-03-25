import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  useEffect(() => {
    const f = async () => {
      await window.electronAPI.init();
    };
    f();
  }, []);
  return (
    <div>
      <h1>Dashboard</h1>
      <Link to="/imaging">imaging</Link>
    </div>
  );
};