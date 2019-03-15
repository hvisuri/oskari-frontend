import React from 'react';
import PropTypes from 'prop-types';
import {withContext} from '../../../../src/react/util.jsx';

const ClassificationCheckbox = ({properties, value, handleChange, disabled}) => {
    return (
        <div className={properties.class + ' option'}>
            <label className="label oskari-checkboxinput">
                <input type="checkbox" checked={value} disabled = {disabled}
                    onChange={evt => handleChange(properties.id, evt.target.checked)}/>
                <span>{properties.label}</span>
            </label>
        </div>
    );
};

ClassificationCheckbox.propTypes = {
    properties: PropTypes.object,
    disabled: PropTypes.bool,
    value: PropTypes.bool,
    handleChange: PropTypes.func
};

const contextWrapped = withContext(ClassificationCheckbox);
export {contextWrapped as ClassificationCheckbox};
