// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IWindoge95.sol";

contract GameDirectory is Ownable {
    IWindoge95 public winDoge95Token;
    uint256 public listingFee;
    uint256 public minVotingThreshold;
    uint256 public minVotingThresholdTokens;
    uint256 public approvalThreshold;
    uint256 public approvalThresholdTokens;

    struct Game {
        string title;
        string description;
        string category;
        string imageUrl;
        string gameUrl;
        address owner;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        uint256 totalVotes;
        bool approved;
        bool rejected;
    }

    Game[] public games;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    event GameListed(uint256 indexed gameId, address indexed owner);
    event GameVoted(
        uint256 indexed gameId,
        address indexed voter,
        bool approved,
        uint256 weight
    );
    event GameApproved(uint256 indexed gameId);
    event GameRejected(uint256 indexed gameId);

    constructor(
        address _winDoge95Token,
        uint256 _listingFee,
        uint256 _minVotingThreshold,
        uint256 _approvalThreshold
    ) Ownable(msg.sender) {
        winDoge95Token = IWindoge95(_winDoge95Token);
        listingFee = _listingFee;
        minVotingThreshold = _minVotingThreshold;
        approvalThreshold = _approvalThreshold;

        uint256 totalSupply = winDoge95Token.totalSupply();

        minVotingThresholdTokens = (totalSupply * _minVotingThreshold) / 100;
        approvalThresholdTokens =
            (minVotingThresholdTokens * _approvalThreshold) /
            100;
    }

    function listGame(
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        string memory _gameUrl
    ) external {
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_description).length > 0, "Description is required");
        require(bytes(_category).length > 0, "Category is required");
        require(bytes(_imageUrl).length > 0, "Image URL is required");
        require(bytes(_gameUrl).length > 0, "Game URL is required");

        bool transferSuccess = winDoge95Token.transferFrom(
            msg.sender,
            address(winDoge95Token),
            listingFee
        );
        require(transferSuccess, "Listing fee transfer failed");

        games.push(
            Game({
                title: _title,
                description: _description,
                category: _category,
                imageUrl: _imageUrl,
                gameUrl: _gameUrl,
                owner: msg.sender,
                approvalVotes: 0,
                rejectionVotes: 0,
                totalVotes: 0,
                approved: false,
                rejected: false
            })
        );

        emit GameListed(games.length - 1, msg.sender);
    }

    function voteForGame(uint256 _gameId, bool _approve) external {
        require(_gameId < games.length, "Invalid game ID");
        require(
            !games[_gameId].approved && !games[_gameId].rejected,
            "Voting has ended for this game"
        );
        require(!hasVoted[msg.sender][_gameId], "Already voted for this game");

        uint256 voterBalance = winDoge95Token.balanceOf(msg.sender);
        uint256 voteWeight = voterBalance;
        uint256 rejectionThresholdTokens = minVotingThresholdTokens -
            approvalThresholdTokens;

        if (_approve) {
            games[_gameId].approvalVotes += voteWeight;
        } else {
            games[_gameId].rejectionVotes += voteWeight;
        }

        games[_gameId].totalVotes += voteWeight;

        hasVoted[msg.sender][_gameId] = true;

        emit GameVoted(_gameId, msg.sender, _approve, voteWeight);

        // Update voter reward multiplier
        winDoge95Token.updateRewardMultiplier(msg.sender, false);

        // Check if minimum voting threshold is reached
        if (games[_gameId].totalVotes >= minVotingThresholdTokens) {
            if (games[_gameId].approvalVotes >= approvalThresholdTokens) {
                games[_gameId].approved = true;
                emit GameApproved(_gameId);

                // Update builder reward multiplier
                winDoge95Token.updateRewardMultiplier(
                    games[_gameId].owner,
                    true
                );
            } else if (
                games[_gameId].rejectionVotes >= rejectionThresholdTokens
            ) {
                games[_gameId].rejected = true;
                emit GameRejected(_gameId);
            }
        }
    }

    function batchVoteForGames(
        uint256[] calldata _gameIds,
        bool[] calldata _approves
    ) external {
        require(
            _gameIds.length == _approves.length,
            "Mismatched input lengths"
        );

        uint256 voterBalance = winDoge95Token.balanceOf(msg.sender);
        uint256 voteWeight = voterBalance;
        uint256 rejectionThresholdTokens = minVotingThresholdTokens -
            approvalThresholdTokens;

        for (uint256 i = 0; i < _gameIds.length; i++) {
            uint256 gameId = _gameIds[i];
            bool approve = _approves[i];

            require(gameId < games.length, "Invalid game ID");
            require(
                !games[gameId].approved && !games[gameId].rejected,
                "Voting has ended for this game"
            );
            require(
                !hasVoted[msg.sender][gameId],
                "Already voted for this game"
            );

            if (approve) {
                games[gameId].approvalVotes += voteWeight;
            } else {
                games[gameId].rejectionVotes += voteWeight;
            }

            games[gameId].totalVotes += voteWeight;

            hasVoted[msg.sender][gameId] = true;

            emit GameVoted(gameId, msg.sender, approve, voteWeight);

            // Update voter reward multiplier
            winDoge95Token.updateRewardMultiplier(msg.sender, false);

            // Check if minimum voting threshold is reached
            if (games[gameId].totalVotes >= minVotingThresholdTokens) {
                if (games[gameId].approvalVotes >= approvalThresholdTokens) {
                    games[gameId].approved = true;
                    emit GameApproved(gameId);

                    // Update builder reward multiplier
                    winDoge95Token.updateRewardMultiplier(
                        games[gameId].owner,
                        true
                    );
                } else if (
                    games[gameId].rejectionVotes >= rejectionThresholdTokens
                ) {
                    games[gameId].rejected = true;
                    emit GameRejected(gameId);
                }
            }
        }
    }

    function getGame(uint256 _gameId) external view returns (Game memory) {
        require(_gameId < games.length, "Invalid game ID");
        return games[_gameId];
    }

    function getGameCount() external view returns (uint256) {
        return games.length;
    }

    function getAllGames() external view returns (Game[] memory) {
        return games;
    }

    function setListingFee(uint256 _newFee) external onlyOwner {
        listingFee = _newFee;
    }

    function setApprovalThreshold(uint256 _newThreshold) external onlyOwner {
        require(_newThreshold > 0 && _newThreshold <= 100, "Invalid threshold");
        approvalThreshold = _newThreshold;
    }
}
