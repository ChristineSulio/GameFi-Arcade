import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GOLDToken", (m) => {
    const goldToken = m.contract("GOLDToken");
    return { goldToken };
});