'use strict';

const _ = require('lodash');
const utils = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');
// Use your custom validation instead
const { validateRegisterBody } = require('./server/controllers/validation/auth');

const { sanitize } = utils;
const { ApplicationError, ValidationError } = utils.errors;

module.exports = (plugin) => {
  // Create new custom controller by extending the original
  plugin.controllers.auth.register = async (ctx) => {
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const settings = await pluginStore.get({ key: 'advanced' });

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled');
    }

    const params = {
      ..._.omit(ctx.request.body, ['confirmed', 'blocked']),
      provider: 'local',
    };

    // Use your custom validation
    await validateRegisterBody(params);

    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: params.role || 'student' } });

    if (!role) {
      throw new ValidationError('Specified role does not exist');
    }

    // Check if role is allowed for registration
    if (role.type !== 'student' && role.type !== 'authenticated' && role.type !== 'admin') {
      throw new ValidationError('Invalid role specified for registration');
    }

    params.role = role.id;

    const user = await getService('user').add(params);

    const sanitizedUser = await sanitize.contentAPI.output(user, strapi.getModel('plugin::users-permissions.user'));

    if (settings.email_confirmation) {
      try {
        await getService('user').sendConfirmationEmail(user);
      } catch (err) {
        throw new ApplicationError(err.message);
      }

      return ctx.send({ user: sanitizedUser });
    }

    const jwt = getService('jwt').issue(_.pick(user, ['id']));

    return ctx.send({
      jwt,
      user: sanitizedUser,
    });
  };

  return plugin;
};