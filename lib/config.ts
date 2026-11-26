/** Public addresses contain no credentials; local servers still work without Sites. */
export const REFERENCE_SITE_URL = "https://typescript-practices-reference.shahvirajd.chatgpt.site";
export const PUBLIC_API_URL = "https://typescript-practices-api.shahvirajd.chatgpt.site";
// Sites reserves /mcp for its authenticated plugin. This path is the public
// Streamable HTTP transport; the private Site plugin continues to use /mcp.
export const PUBLIC_MCP_URL = `${PUBLIC_API_URL}/api/mcp`;
