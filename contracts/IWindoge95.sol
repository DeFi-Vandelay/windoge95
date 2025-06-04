// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWindoge95 is IERC20 {
    function updateRewardMultiplier(address user, bool isBuilder) external;
}
