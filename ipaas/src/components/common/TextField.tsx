/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FormControl, FormLabel, TextField as OxygenTextField, type TextFieldProps } from '@wso2/oxygen-ui';
import { forwardRef, useId, useState, type JSX } from 'react';

/**
 * Oxygen's TextField with its label above the field, in a FormLabel, instead of
 * floating inside the outline. A drop-in replacement: same props, same root box.
 * With a label, `ref` points to the outer FormControl (label and field); without one, to oxygen's own root.
 */
const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField(props, ref): JSX.Element {
  const { label, id: idProp, sx, className, style, fullWidth, margin, required, error, disabled, slotProps, onFocus, onBlur, helperText: helperProp, ...rest } = props;
  const generatedId = useId();
  // The inner field tracks its own focus, so it is lifted to the outer FormControl for the label to colour on focus.
  const [focused, setFocused] = useState(false);
  // A field that validates keeps its helper line even while empty, so an error appearing does not shift the form.
  const helperText = error !== undefined && (helperProp == null || helperProp === '') ? ' ' : helperProp;

  if (label == null || label === '') return <OxygenTextField ref={ref} {...props} helperText={helperText} />;

  const id = idProp ?? generatedId;
  const labelId = `${id}-label`;
  // A select's combobox is a div, which a <label for> cannot name, so it is named through labelId instead.
  const selectSlot = rest.select ? { select: { ...(slotProps?.select as object | undefined), labelId } } : {};

  return (
    // The layout props stay on the outer box so the field occupies the same space it did with a floating label.
    <FormControl ref={ref} sx={sx} className={className} style={style} fullWidth={fullWidth} margin={margin} required={required} error={error} disabled={disabled} focused={focused}>
      <FormLabel id={labelId} htmlFor={id}>
        {label}
      </FormLabel>
      <OxygenTextField
        {...rest}
        id={id}
        fullWidth
        required={required}
        error={error}
        disabled={disabled}
        helperText={helperText}
        slotProps={{ ...slotProps, ...selectSlot }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
    </FormControl>
  );
});

export default TextField;
