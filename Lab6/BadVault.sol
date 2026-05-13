// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BadVault {
    mapping(address => uint) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        balances[tx.origin] += msg.value; // Lỗi: Sử dụng tx.origin
    }

    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}(""); // Lỗi: Unchecked return value (nếu version cũ) & Reentrancy
        balances[msg.sender] = 0; // Lỗi: CEI pattern vi phạm
    }
    
    function suicide() public {
        selfdestruct(payable(owner)); // Lỗi: Dangerous & Deprecated
    }
    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}