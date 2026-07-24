import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".local/**"] },
  ...nextVitals,
];

export default config;
