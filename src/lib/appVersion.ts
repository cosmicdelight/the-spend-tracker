export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD_TIME = __APP_BUILD_TIME__;

export const APP_BUILD_LABEL = `${APP_VERSION} (${new Date(APP_BUILD_TIME).toLocaleString()})`;
