// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Ownable {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

interface IUniswapV2Factory {
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
}

interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract Windoge95 is IERC20, Ownable, ReentrancyGuard {
    // Basic settings
    string private constant _name = "Windoge95";
    string private constant _symbol = "DOS";
    uint8 private constant _decimals = 9;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Tax settings
    uint256 public buyTaxRate;
    uint256 public constant MAX_BUY_TAX = 15; // 15%
    uint256 public constant MIN_BUY_TAX = 1; // 1%

    uint256 public sellTaxRate;
    uint256 public constant MAX_SELL_TAX = 15; // 15%
    uint256 public constant MIN_SELL_TAX = 1; // 1%

    mapping(address => bool) private _isExcludedFromFees;

    event TaxRatesUpdated(uint256 newBuyTaxRate, uint256 newSellTaxRate);

    // Swap settings
    bool public tradingEnabled = false;
    bool private swapping;
    uint256 public swapTokensAtAmount;

    uint256 public maxTxAmount;
    uint256 public constant MIN_TX_PERCENT = 1; // 1% of total supply
    uint256 public constant MAX_TX_PERCENT = 10; // 10% of total supply

    uint256 public maxWalletSize;
    uint256 public constant MIN_WALLET_PERCENT = 1; // 1% of total supply
    uint256 public constant MAX_WALLET_PERCENT = 10; // 10% of total supply

    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;

    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiquidity
    );

    // Wallets
    address public Treasury;
    address public gameDirectoryAddress;

    event GameDirectoryAddressSet(address indexed newAddress);

    // Reward settings
    address[] public builderAddresses;
    address[] public voterAddresses;
    uint256 public totalBuilderRewards;
    uint256 public totalVoterRewards;

    mapping(address => uint256) public builderRewardMultipliers;
    mapping(address => uint256) public voterRewardMultipliers;
    mapping(address => uint256) public builderRewards;
    mapping(address => uint256) public voterRewards;

    event RewardMultiplierUpdated(
        address indexed user,
        uint256 multiplier,
        bool isBuilder
    );
    event RewardsDistributed(address indexed user, uint256 amount);
    event RewardsAvailable(uint256 builderRewards, uint256 voterRewards);

    // Add this new variable to track accumulated fees
    uint256 public accumulatedFees;

    constructor(
        address _routerAddress,
        address _treasuryAddress,
        uint256 _initialSupply,
        uint256 _buyTaxRate,
        uint256 _sellTaxRate,
        uint256 _maxTxAmount,
        uint256 _maxWalletSize
    ) ReentrancyGuard() {
        require(
            _treasuryAddress != address(0),
            "Treasury address cannot be zero"
        );
        require(_initialSupply > 0, "Initial supply must be greater than zero");
        require(
            _buyTaxRate >= MIN_BUY_TAX && _buyTaxRate <= MAX_BUY_TAX,
            "Buy tax rate must be between 1% and 15%"
        );
        require(
            _sellTaxRate >= MIN_SELL_TAX && _sellTaxRate <= MAX_SELL_TAX,
            "Sell tax rate must be between 1% and 15%"
        );

        _totalSupply = _initialSupply;
        _balances[msg.sender] = _totalSupply;

        buyTaxRate = _buyTaxRate;
        sellTaxRate = _sellTaxRate;
        swapTokensAtAmount = _totalSupply / 100; // 1% of total supply

        Treasury = _treasuryAddress;

        // Validate and set maxTxAmount
        uint256 minTxAmount = (_totalSupply * MIN_TX_PERCENT) / 100;
        uint256 maxTxAmountLimit = (_totalSupply * MAX_TX_PERCENT) / 100;
        require(
            _maxTxAmount >= minTxAmount && _maxTxAmount <= maxTxAmountLimit,
            string(abi.encodePacked(
                "Invalid max transaction amount. Must be between ",
                uint2str(minTxAmount),
                " and ",
                uint2str(maxTxAmountLimit),
                ". Provided: ",
                uint2str(_maxTxAmount),
                ". Total Supply: ",
                uint2str(_totalSupply)
            ))
        );
        maxTxAmount = _maxTxAmount;

        // Validate and set maxWalletSize
        uint256 minWalletSize = (_totalSupply * MIN_WALLET_PERCENT) / 100;
        uint256 maxWalletSizeLimit = (_totalSupply * MAX_WALLET_PERCENT) / 100;
        require(
            _maxWalletSize >= minWalletSize && _maxWalletSize <= maxWalletSizeLimit,
            string(abi.encodePacked(
                "Invalid max wallet size. Must be between ",
                uint2str(minWalletSize),
                " and ",
                uint2str(maxWalletSizeLimit),
                ". Provided: ",
                uint2str(_maxWalletSize),
                ". Total Supply: ",
                uint2str(_totalSupply)
            ))
        );
        maxWalletSize = _maxWalletSize;

        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
            _routerAddress
        );
        uniswapV2Router = _uniswapV2Router;
        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
            .createPair(address(this), _uniswapV2Router.WETH());

        // Exclude important addresses from fees
        _isExcludedFromFees[owner()] = true;
        _isExcludedFromFees[address(this)] = true;
        _isExcludedFromFees[Treasury] = true;
        _isExcludedFromFees[_routerAddress] = true;
        _isExcludedFromFees[uniswapV2Pair] = true;

        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function setGameDirectoryAddress(
        address _gameDirectoryAddress
    ) external onlyOwner {
        require(_gameDirectoryAddress != address(0), "Invalid address");

        gameDirectoryAddress = _gameDirectoryAddress;
        _isExcludedFromFees[_gameDirectoryAddress] = true;

        emit GameDirectoryAddressSet(_gameDirectoryAddress);
    }

    function updateRewardMultiplier(address user, bool isBuilder) external {
        require(
            msg.sender == gameDirectoryAddress,
            "Only GameDirectory can update multipliers"
        );
        require(user != address(0), "Invalid user address");

        uint256 userBalance = balanceOf(user);

        if (isBuilder) {
            if (builderRewardMultipliers[user] == 0) {
                builderAddresses.push(user);
            }
            builderRewardMultipliers[user] += userBalance;
            totalBuilderRewards += userBalance;
        } else {
            if (voterRewardMultipliers[user] == 0) {
                voterAddresses.push(user);
            }
            voterRewardMultipliers[user] += userBalance;
            totalVoterRewards += userBalance;
        }

        emit RewardMultiplierUpdated(
            user,
            isBuilder
                ? builderRewardMultipliers[user]
                : voterRewardMultipliers[user],
            isBuilder
        );
    }

    function name() public pure returns (string memory) {
        return _name;
    }

    function symbol() public pure returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(
            currentAllowance >= amount,
            "ERC20: transfer amount exceeds allowance"
        );
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        
        // Check if the recipient is this contract (listing fee transfer)
        if (recipient == address(this)) {
            // Add the amount to accumulatedFees
            accumulatedFees += amount;
            _balances[sender] -= amount;
            _balances[address(this)] += amount;
            emit Transfer(sender, address(this), amount);
        } else {
            _transfer(sender, recipient, amount);
        }
        
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(
            tradingEnabled ||
                _isExcludedFromFees[sender] ||
                _isExcludedFromFees[recipient],
            "Trading is not enabled yet"
        );
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        require(
            amount <= maxTxAmount ||
                _isExcludedFromFees[sender] ||
                _isExcludedFromFees[recipient],
            "Transfer amount exceeds the maxTxAmount"
        );

        uint256 senderBalance = _balances[sender];
        require(
            senderBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );

        uint256 recipientBalance = _balances[recipient];
        require(
            recipientBalance + amount <= maxWalletSize ||
                _isExcludedFromFees[recipient],
            "Transfer would exceed max wallet size"
        );

        uint256 taxAmount = 0;

        if (!_isExcludedFromFees[sender] && !_isExcludedFromFees[recipient] && recipient != address(this)) {
            uint256 taxRate = sender == uniswapV2Pair
                ? buyTaxRate
                : sellTaxRate;
            taxAmount = (amount * taxRate) / 100;

            // Update accumulatedFees
            accumulatedFees += taxAmount;

            // Subtract the total amount from sender
            _balances[sender] = senderBalance - amount;

            // Transfer the net amount to recipient
            uint256 transferAmount = amount - taxAmount;
            _balances[recipient] += transferAmount;

            // Add taxAmount to the contract's balance
            _balances[address(this)] += taxAmount;

            emit Transfer(sender, recipient, transferAmount);
            emit Transfer(sender, address(this), taxAmount);

            // Handle swapping and distribution
            if (
                accumulatedFees >= swapTokensAtAmount &&
                !swapping &&
                sender != uniswapV2Pair
            ) {
                swapAndDistribute();
            }
        } else {
            // If fees are excluded or it's a listing fee transfer, proceed with normal transfer
            _balances[sender] = senderBalance - amount;
            _balances[recipient] += amount;
            emit Transfer(sender, recipient, amount);
        }
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function swapAndDistribute() private nonReentrant {
        swapping = true;

        uint256 taxAmount = accumulatedFees;
        uint256 taxForETH = taxAmount / 2;
        uint256 taxForTokens = taxAmount - taxForETH;

        // Reset accumulatedFees
        accumulatedFees = 0;

        // Allocate the token tax accordingly
        uint256 builderRewardsAmount = (taxForTokens * 40) / 100; // 40%
        uint256 voterRewardsAmount = (taxForTokens * 20) / 100; // 20%
        uint256 treasuryTokens = (taxForTokens * 40) / 100; // 40%

        // Swap tokens for ETH (only the tokens allocated for ETH)
        swapTokensForEth(taxForETH);

        // Send ETH to Treasury
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = Treasury.call{value: ethBalance}("");
            require(success, "Transfer to Treasury failed");
        }

        // Send tokens to treasury
        _balances[Treasury] += treasuryTokens;
        emit Transfer(address(this), Treasury, treasuryTokens);

        uint256 distributedBuilderRewards = 0;
        uint256 distributedVoterRewards = 0;

        // Distribute builder rewards
        if (totalBuilderRewards > 0) {
            for (uint256 i = 0; i < builderAddresses.length; i++) {
                address builder = builderAddresses[i];
                uint256 builderWeight = builderRewardMultipliers[builder];
                if (builderWeight > 0) {
                    uint256 builderReward = (builderRewardsAmount *
                        builderWeight) / totalBuilderRewards;
                    _balances[builder] += builderReward;
                    distributedBuilderRewards += builderReward;
                    emit Transfer(address(this), builder, builderReward);
                    emit RewardsDistributed(builder, builderReward);
                }
            }
        }

        // Distribute voter rewards
        if (totalVoterRewards > 0) {
            for (uint256 i = 0; i < voterAddresses.length; i++) {
                address voter = voterAddresses[i];
                uint256 voterWeight = voterRewardMultipliers[voter];
                if (voterWeight > 0) {
                    uint256 voterReward = (voterRewardsAmount * voterWeight) /
                        totalVoterRewards;
                    _balances[voter] += voterReward;
                    distributedVoterRewards += voterReward;
                    emit Transfer(address(this), voter, voterReward);
                    emit RewardsDistributed(voter, voterReward);
                }
            }
        }

        swapping = false;
        emit RewardsAvailable(builderRewardsAmount, voterRewardsAmount);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // Generate the Uniswap pair path of token -> WETH
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        // Approve token transfer to cover all possible scenarios
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // Make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // Accept any amount of ETH
            path,
            address(this), // The contract will receive the ETH
            block.timestamp
        );
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading is already enabled");
        tradingEnabled = true;
        renounceOwnership();
    }

    function setTaxRates(
        uint256 newBuyTaxRate,
        uint256 newSellTaxRate
    ) external onlyOwner {
        require(
            newBuyTaxRate >= MIN_BUY_TAX && newBuyTaxRate <= MAX_BUY_TAX,
            "Buy tax rate must be between 1% and 15%"
        );
        require(
            newSellTaxRate >= MIN_SELL_TAX && newSellTaxRate <= MAX_SELL_TAX,
            "Sell tax rate must be between 1% and 15%"
        );
        buyTaxRate = newBuyTaxRate;
        sellTaxRate = newSellTaxRate;
        emit TaxRatesUpdated(newBuyTaxRate, newSellTaxRate);
    }

    function excludeFromFees(address account) external onlyOwner {
        _isExcludedFromFees[account] = true;
    }

    function includeInFees(address account) external onlyOwner {
        _isExcludedFromFees[account] = false;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero address");
        Treasury = newTreasury;
    }

    function setSwapTokensAtAmount(uint256 amount) external onlyOwner {
        swapTokensAtAmount = amount;
    }

    receive() external payable {}

    function withdrawETH() external nonReentrant {
        require(msg.sender == Treasury, "Only Treasury can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success, ) = Treasury.call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }

    function setMaxTxAmount(uint256 newMaxTxAmount) external onlyOwner {
        uint256 minAmount = (_totalSupply * MIN_TX_PERCENT) / 100;
        uint256 maxAmount = (_totalSupply * MAX_TX_PERCENT) / 100;
        require(
            newMaxTxAmount >= minAmount && newMaxTxAmount <= maxAmount,
            "Max transaction amount must be between 1% and 10% of total supply"
        );
        maxTxAmount = newMaxTxAmount;
    }

    function setMaxWalletSize(uint256 newMaxWalletSize) external onlyOwner {
        uint256 minAmount = (_totalSupply * MIN_WALLET_PERCENT) / 100;
        uint256 maxAmount = (_totalSupply * MAX_WALLET_PERCENT) / 100;
        require(
            newMaxWalletSize >= minAmount && newMaxWalletSize <= maxAmount,
            "Max wallet size must be between 2% and 20% of total supply"
        );
        maxWalletSize = newMaxWalletSize;
    }

    // Add a new function to check accumulated fees
    function getAccumulatedFees() public view returns (uint256) {
        return accumulatedFees;
    }

    // Add this helper function to convert uint to string
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
