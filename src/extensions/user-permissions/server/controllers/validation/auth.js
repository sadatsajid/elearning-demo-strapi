'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

// Extend the default register validation schema
const registerBodySchema = yup.object().shape({
  email: yup.string().email().required(),
  username: yup.string().required(),
  password: yup.string().required(),
  role: yup.string(), // Add role field to validation schema
});

// Export the validation function
const validateRegisterBody = validateYupSchema(registerBodySchema);

module.exports = {
  validateRegisterBody,
};