// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DigitalWill {
    struct Will {
        address owner;
        address recipient;
        string containerName;
        uint256 unlockTime;
        bool isExecuted;
        bool isVerified;
    }

    Will[] public wills;

    event WillCreated(uint indexed willId, address indexed owner, address indexed recipient);
    event WillExecuted(uint indexed willId);

    // Создание завещания
    function createWill(
        address _recipient,
        string memory _containerName,
        uint256 _unlockTime,
        bool _isVerified
    ) public {
        require(_recipient != address(0), "Некорректный адрес получателя");
        require(_unlockTime >= block.timestamp, "Дата разблокировки должна быть назначена на сегодня или в будущую дату");

        wills.push(Will({
            owner: msg.sender,
            recipient: _recipient,
            containerName: _containerName,
            unlockTime: _unlockTime,
            isExecuted: false,
            isVerified: _isVerified
        }));

        emit WillCreated(wills.length - 1, msg.sender, _recipient);
    }

    // Получение всех завещаний, созданных пользователем
    function getMyWills() public view returns (Will[] memory) {
        uint count = 0;
        for (uint i = 0; i < wills.length; i++) {
            if (wills[i].owner == msg.sender) {
                count++;
            }
        }

        Will[] memory result = new Will[](count);
        uint j = 0;
        for (uint i = 0; i < wills.length; i++) {
            if (wills[i].owner == msg.sender) {
                result[j] = wills[i];
                j++;
            }
        }

        return result;
    }

    // Исполнение завещания получателем
    function executeWill(uint willId) public {
        require(willId < wills.length, "Неверный ID завещания");
        Will storage will = wills[willId];
        require(msg.sender == will.recipient, "Вы не получатель этого завещания");
        require(!will.isExecuted, "Завещание уже исполнено");
        require(block.timestamp > will.unlockTime, "Завещание пока заблокировано");

        will.isExecuted = true;

        emit WillExecuted(willId);
    }
}
