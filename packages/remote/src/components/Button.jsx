import './Button.css';

import { useState } from 'react';
import { useSharedState } from '../MyContext';
export const Button = () => {
    const { count, increment } = useSharedState()
    return (
        <div>
            <button
                id="click-btn"
                className="shared-btn"
                onClick={increment}>
                hello world: {count}
            </button>
        </div>
    );
};

export default Button;