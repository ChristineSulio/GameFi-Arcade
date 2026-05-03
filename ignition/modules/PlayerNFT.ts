import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import GOLDTokenModule from "./GOLDToken.js";

export default buildModule("PlayerNFT", (m) => {
    const { goldToken } = m.useModule(GOLDTokenModule);
    const playerNFT = m.contract("PlayerNFT", [goldToken]);
    return { goldToken, playerNFT };
});