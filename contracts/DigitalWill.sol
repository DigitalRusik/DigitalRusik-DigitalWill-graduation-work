// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalWill {
    address public owner;

    struct Will {
        address owner;
        address recipient;
        uint256 unlockTime;
        string ipfsHash; // Идентификатор данных
        bool claimed;
    }

    mapping(address => bool) public isVerified;
    mapping(uint256 => Will) public wills;
    uint256 public willCount = 0;

    event WillCreated(uint256 willId, address owner, address recipient, uint256 unlockTime);
    event WillClaimed(uint256 willId, address recipient);

    constructor() {
        owner = msg.sender;
    }

    // Только админ может верифицировать пользователей (в будущем - из backend)
    function verifyUser(address user) external {
        require(msg.sender == owner, "Only admin can verify users");
        isVerified[user] = true;
    }

    // Создание завещания — только для верифицированных
    function createWill(address recipient, uint256 unlockTime, string memory ipfsHash) external {
        require(isVerified[msg.sender], "User not verified");
        require(recipient != address(0), "Recipient required");
        require(unlockTime > block.timestamp, "Unlock time must be in the future");

        wills[willCount] = Will({
            owner: msg.sender,
            recipient: recipient,
            unlockTime: unlockTime,
            ipfsHash: ipfsHash,
            claimed: false
        });

        emit WillCreated(willCount, msg.sender, recipient, unlockTime);
        willCount++;
    }

    // Получение завещания — доступно после срока
    function claimWill(uint256 willId) external view returns (string memory) {
        Will memory w = wills[willId];
        require(block.timestamp >= w.unlockTime, "Will is locked");
        require(msg.sender == w.recipient, "Not recipient");

        return w.ipfsHash; // Это может быть CID IPFS или хеш
    }
}
