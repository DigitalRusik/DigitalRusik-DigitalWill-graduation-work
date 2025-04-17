
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalWill {
    address public owner;
    address public recipient;
    uint public unlockTime;
    string public dataHash;

    constructor(address _recipient, uint _unlockTime, string memory _dataHash) {
        owner = msg.sender;
        recipient = _recipient;
        unlockTime = _unlockTime;
        dataHash = _dataHash;
    }

    function canExecute() public view returns (bool) {
        return block.timestamp >= unlockTime;
    }
}
