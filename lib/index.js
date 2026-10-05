//#region lib/index.js
/**
 * Russian language pack, node half. Pure UI plugin: the empty apply exists so
 * the plugin appears in the host Loader; the browser half ships via
 * exports["./client"] and is discovered through the package.json dsh.client
 * declaration.
 */
/** Host plugin body - no host-side behavior for this language pack. */
function apply() {}
//#endregion
export { apply };
