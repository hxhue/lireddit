import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Textarea,
} from "@chakra-ui/react";
import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & {
  label: string;
  name: string;
  textarea?: boolean;
};

export const InputField: React.FC<InputFieldProps> = ({
  label,
  size: _,
  textarea,
  ...props
}) => {
  // useField() returns FieldRenderProps. It will manage the rerendering of
  // any component you use it in, i.e. the component will only rerender if 
  // the field state subscribed to via useField() changes.
  const [field, { error }] = useField(props);

  let Component = textarea ? Textarea : Input;
  return (
    // In javascript, empty string '' is considered false when used as condition.
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <Component
        {...field}
        {...props}
        id={field.name}
        placeholder={props.placeholder}
      />
      {/* {textarea ? (
        <Textarea>
          {...field}
          {...props}
          id={field.name}
          placeholder={props.placeholder}
        </Textarea>
      ) : (
        <Input>
          {...field}
          {...props}
          id={field.name}
          placeholder={props.placeholder}
        </Input>
      )} */}
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
};

export default InputField;
