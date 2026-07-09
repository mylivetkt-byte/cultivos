// src/context/GlobalSelectorsContext.jsx
import React, { createContext, useContext, useReducer } from 'react';

// Estado inicial con los selectores que necesita la aplicación
const initialState = {
  cliente: null,
  finca: null,
  nucleo: null,
  parcela: null,
  cultivo: null,
  equipo: null,
  fecha: null,
};

// Acciones que pueden modificarse
const ACTIONS = {
  SET_CLIENTE: 'SET_CLIENTE',
  SET_FINCA: 'SET_FINCA',
  SET_NUCLEO: 'SET_NUCLEO',
  SET_PARCELA: 'SET_PARCELA',
  SET_CULTIVO: 'SET_CULTIVO',
  SET_EQUIPO: 'SET_EQUIPO',
  SET_FECHA: 'SET_FECHA',
  RESET: 'RESET',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CLIENTE:
      return { ...state, cliente: action.payload };
    case ACTIONS.SET_FINCA:
      return { ...state, finca: action.payload };
    case ACTIONS.SET_NUCLEO:
      return { ...state, nucleo: action.payload };
    case ACTIONS.SET_PARCELA:
      return { ...state, parcela: action.payload };
    case ACTIONS.SET_CULTIVO:
      return { ...state, cultivo: action.payload };
    case ACTIONS.SET_EQUIPO:
      return { ...state, equipo: action.payload };
    case ACTIONS.SET_FECHA:
      return { ...state, fecha: action.payload };
    case ACTIONS.RESET:
      return initialState;
    default:
      return state;
  }
}

const GlobalSelectorsContext = createContext();

export const GlobalSelectorsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Helpers de conveniencia
  const setCliente = (value) => dispatch({ type: ACTIONS.SET_CLIENTE, payload: value });
  const setFinca = (value) => dispatch({ type: ACTIONS.SET_FINCA, payload: value });
  const setNucleo = (value) => dispatch({ type: ACTIONS.SET_NUCLEO, payload: value });
  const setParcela = (value) => dispatch({ type: ACTIONS.SET_PARCELA, payload: value });
  const setCultivo = (value) => dispatch({ type: ACTIONS.SET_CULTIVO, payload: value });
  const setEquipo = (value) => dispatch({ type: ACTIONS.SET_EQUIPO, payload: value });
  const setFecha = (value) => dispatch({ type: ACTIONS.SET_FECHA, payload: value });
  const resetSelectors = () => dispatch({ type: ACTIONS.RESET });

  return (
    <GlobalSelectorsContext.Provider
      value={{
        state,
        setCliente,
        setFinca,
        setNucleo,
        setParcela,
        setCultivo,
        setEquipo,
        setFecha,
        resetSelectors,
      }}
    >
      {children}
    </GlobalSelectorsContext.Provider>
  );
};

export const useGlobalSelectors = () => useContext(GlobalSelectorsContext);

// Export actions for external use (optional)
export const GLOBAL_SELECTORS_ACTIONS = ACTIONS;
