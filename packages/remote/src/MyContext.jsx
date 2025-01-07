import { createContext, useContext, useState } from 'react';

const MyContext = createContext(undefined);

export const MyProvider = ({ children }) => {
    const [count, setCount] = useState(0);

    const increment = () => setCount((prev) => prev + 1);

    return <MyContext.Provider value={{ count, increment }}>{children}</MyContext.Provider>;
};

export const useSharedState = () => {
    const context = useContext(MyContext);
    if (!context) throw new Error('useSharedState must be used within a MyProvider');
    return context;
};