import React, {useEffect, useState} from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import contractAbi from './Domains.json'
import {ethers} from "ethers";
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'manethye';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const CONTRACT_ADDRESS = "0xc4D1b166F705dceeb2F45C13A4426849044D3F59";
const tld = '.sheep'

const App = () => {
  // Global State
  const [currentAccount, setCurrentAccount] = useState('');
  const [domain, setDomain] = useState('');
  const [record, setRecord] = useState('');
  const [network, setNetwork] = useState('');
  const [loading, setLoading] = useState('');
  const [editing, setEditing] = useState('');
  const [mints, setMints] = useState([]);

  const connectWallet = async () => {
    try {
     const {ethereum} = window;

    if (!ethereum) {
      alert('Get Metamask -> https://metamask.io');
      return;
    }
    
    const accounts = await ethereum.request({method: 'eth_requestAccounts'});

    console.log('Connected', accounts[0]);
    setCurrentAccount(accounts[0]); 
    } catch (e) {
      console.log(e);
    }
  }
  
  const checkIfWalletIsConnected = async () => {
    const {ethereum} = window;

    if (!ethereum) {
      console.log('Make sure you have MetaMask installed!')
    } else {
      console.log('We have the ethereum object', ethereum)
    }

    const accounts = await ethereum.request({method: 'eth_accounts'});

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log('Found an authorized account:', account);
      setCurrentAccount(account);
    } else {
      console.log('No authorized accounts found');
    }

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    setNetwork(networks[chainId]);

    ethereum.on('chainChanged', handleChainChanged);
    
    // Reload the page when they change networks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  }

  const mintDomain = async () => {
    if (!domain) return;

    if (domain.length < 3) {
      alert('Domain must be atleast 3 characters long');
      return;
    }

    const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1'
    console.log("Minting domain", domain, "with price", price);

    try {
      const {ethereum} = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        console.log('Going to pop wallet now to pay gass..')

        let txn = await contract.register(domain, {value: ethers.utils.parseEther(price)});
        const receipt = await txn.wait()

        if (receipt.status === 1) {
          console.log('Domain minted! https://mumbai.polygonscan.com/tx/'+txn.hash);

          txn = await contract.setRecord(domain, record);
          await txn.wait()

          console.log('Record set! https://mumbai.polygonscan.com/tx/'+txn.hash)

        setTimeout(() => {
          fetchMints();
        }, 2000);

          setDomain('');
          setRecord('');
        }
      } else {
        alert('Transaction failed! Please try again')
      }
    } catch(e) {
      console.log(e)
    }
  }

  const updateDomain = async () => {
    if (!record || !domain) return;

    setLoading(true);

    console.log('Updating domain', domain, 'with record', record);

    try {
      const {ethereum} = window;
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

      let tx = await contract.setRecord(domain, record);
      await tx.wait();
      console.log('Record set https://mumbai.polygonscan.com/tx/'+tx.hash)

      fetchMints();
      setRecord('');
      setDomain('');
    } catch (error) {
      console.log(error);
    }
  }

  const fetchMints = async () => {
    try {
      const {ethereum} = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        const names = await contract.getAllNames();

        const mintRecords = await Promise.all(names.map(async (name) => {
          const mintRecord = await contract.records(name);
          const owner = await contract.domains(name);

          return {
            id: names.indexOf(name),
            name: name,
            record: mintRecord,
            owner: owner,
          }
        }));

        console.log('MINTS FETCHED ', mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error)
    }
  }

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{chainId: '0x13881'}]
        })
      } catch (e) {
        if (error.code === 4092) {
          try {
            await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {	
                chainId: '0x13881',
                chainName: 'Polygon Mumbai Testnet',
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18
                },
                blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
              },
            ],
          });
          } catch (error) {
            console.log(error)
          }
        }

        console.log(e)
      }
    }
    else {
      alert('Metamask is not installed. Please install metamask')
    }
  }

  // Render methods
  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <img src="https://i.pinimg.com/originals/cb/02/5f/cb025f6f370a51f09ce11e1191d75437.gif" alt="Sheep's Gif"></img>
      <button onClick={connectWallet} className="cta-button connect-wallet-button">
        Connect Wallet
      </button>
    </div>
  )

  const renderInputForm = () => {
    if (network !== 'Polygon Mumbai Testnet') {
      return (
        <div className="connect-wallet-container">
          <h2>Please switch to Polygon Mumbai Testnet</h2>

          <button className="cta-button mint-button" onClick={switchNetwork}>
            Switch Network To Mumbai Testnet
          </button>
        </div>
      )
    }

    return (
      <div className="form-container">
        <div className="first-row">
          <input type="text" value={domain} placeholder="domain" onChange={e => setDomain(e.target.value)}></input>
          <p className="tld">{tld}</p>
        </div>
  
        <input type="text" value={record} placeholder="Your record here.." onChange={e => setRecord(e.target.value)}></input>
  
        { editing ? (
          <div className="button-container">
            <button className="cta-button mint-button" disabled={loading} onClick={updateDomain}>Set Record</button>
    
            <button className="cta-button mint-button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="button-container">
            <button className="cta-button mint-button" disabled={loading} onClick={mintDomain}>
                Mint Your Sheep's Domain
            </button>
          </div>
      )}
      </div>
    )
}

const renderMints = () => {
  if (currentAccount && mints.length > 0) {
    return (
      <div className="mint-container">
        <p className="subtitle"> Recently minted domains!</p>
        <div className="mint-list">
          { mints.map((mint, index) => {
            return (
              <div className="mint-item" key={index}>
                <div className='mint-row'>
                  <a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
                    <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
                  </a>
                  {/* If mint.owner is currentAccount, add an "edit" button*/}
                  { mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
                    <button className="edit-button" onClick={() => editRecord(mint.name)}>
                      <img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
                    </button>
                    :
                    null
                  }
                </div>
          <p> {mint.record} </p>
        </div>)
        })}
      </div>
    </div>);
  }
};

const editRecord = (name) => {
  console.log('Editing record for', name);
  setEditing(true);
  setDomain(name);
}

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  useEffect(() => {
    if (network === 'Polygon Mumbai Testnet') {
    fetchMints();
  }
  }, [currentAccount, network])

      
return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
            <div className="left">
              <p className="title">🐑 Sheep's Name Service</p>
              <p className="subtitle">Your immortal API on the blockchain!</p>
            </div>

            <div className="right">
                    <img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
              {currentAccount ? <p>Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</p> : <p>Not Connected</p>}
            </div>
					</header>
				</div>

        {!currentAccount && renderNotConnectedContainer()}
        {currentAccount && renderInputForm()}
        {mints && renderMints()}

        <div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
