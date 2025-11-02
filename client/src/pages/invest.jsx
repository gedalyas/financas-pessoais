import React, { useEffect, useMemo, useState } from 'react';

export default function InvestPage() {
  return (
    <div 
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h1 
        style={{
          fontSize: '2rem',
          color: '#333',
          marginBottom: '1rem'
        }}
      >
        Página em Desenvolvimento
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          color: '#666',
          textAlign: 'center'
        }}
      >
        Em breve, novas funcionalidades estarão disponíveis nesta seção.
      </p>
      <div
        style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginTop: '2rem'
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}