/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TextInput,
  FlatList,
} from 'react-native';
import SafeAreaView, {SafeAreaProvider} from 'react-native-safe-area-view';
import {Button} from '@rneui/base';
import {PaperAirplaneIcon} from 'react-native-heroicons/mini';
import {Colors} from 'react-native/Libraries/NewAppScreen';
// @ts-ignore
import io from 'socket.io-client';
import {KeyPair, RSA} from 'react-native-rsa-native';
import EnterModal from './components/EnterModal';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [modalVisible, setModalVisible] = useState(true);
  const [room, setRoom] = useState<number | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [textMessage, setTextMessage] = useState('');
  // const [pendingRoom, setPendingRoom] = useState(0);
  const bottomBarRef = useRef<View>(null);
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const [serverState, setServerState] = useState<string>('Loading...');
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const socket = useRef(
    io('http://localhost:3000', {transports: ['websocket']}),
  ).current;
  const [myKeypair, setMyKeypair] = useState<null | KeyPair>(null);
  const [textItems, setTextItems] = useState<{text: string; isMe: boolean}[]>(
    [],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getKeySnippet = (key: string) => {
    return key.slice(400, 416);
  };
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const notify = (...args) => {};
  const joinRoom = useCallback(
    (roomNr: number) => {
      RSA.generateKeys(2056).then(keypair => {
        setMyKeypair(keypair);
        socket.emit('JOIN', roomNr);
      });
    },
    [socket],
  );
  const sendPublicKey = () => {
    RSA.generateKeys(2056).then(keypair => {
      setMyKeypair(keypair);
      socket.emit('PUBLIC_KEY', keypair.public);
    });
  };

  useEffect(() => {
    socket.on(
      'MESSAGE',
      async (message: {text: string; recipient: string; sender: string}) => {
        // Only decrypt messages that were encrypted with the user's public key
        if (message.recipient === myKeypair?.public) {
          // Decrypt the message text in the webworker thread
          const text = await RSA.decrypt(message.text, myKeypair?.private!);
          setTextItems([
            ...textItems,
            {
              text: text,
              isMe: false,
            },
          ]);
        }
      },
    );

    return () => {
      socket.off('MESSAGE');
    };
  }, [myKeypair?.private, myKeypair?.public, socket, textItems]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('connected');
      setServerState('Connected To Server.');
    });
    // Notify user that they have lost the socket connection
    socket.on('disconnect', () => setServerState('Lost Connection'));
    // Decrypt and display message when received

    // When a user joins the current room, send them your public key
    socket.on('NEW_CONNECTION', () => {
      setServerState('Another user joined the room.');
      sendPublicKey();
    });
    // Broadcast public key when a new room is joined
    socket.on('ROOM_JOINED', (newRoom: number) => {
      setRoom(newRoom);
      setServerState('In Chat');
      sendPublicKey();
    });
    // Save public key when received
    socket.on('PUBLIC_KEY', (key: string) => {
      setServerState('Partner key received');
      setPartner(key);
    });
    // Clear destination public key if other user leaves room
    socket.on('user disconnected', () => {
      notify(`User Disconnected - ${(partner || '').slice(400, 416)}`);
      setPartner(null);
    });
    // Notify user that the room they are attempting to join is full
    socket.on('ROOM_FULL', () => {
      setServerState('Cannot join, room is full');
    });
    // Notify room that someone attempted to join
    socket.on('INTRUSION_ATTEMPT', () => {
      notify('A third user attempted to join the room.');
    });
    return () => {
      socket.off('NEW_CONNECTION');
      socket.off('ROOM_JOINED');
      socket.off('PUBLIC_KEY');
      socket.off('ROOM_FULL');
      socket.off('INTRUSION_ATTEMPT');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd(), 500);
  }, []);

  const renderItem = ({
    item,
    index,
  }: {
    item: {text: string; isMe: boolean};
    index: number;
  }): JSX.Element => {
    return item.isMe ? (
      <View
        style={{
          backgroundColor: '#0078fe',
          padding: 10,
          marginLeft: '45%',
          marginBottom: index === textItems.length - 1 ? 35 : 0,
          marginTop: 5,
          marginRight: '5%',
          maxWidth: '50%',
          alignSelf: 'flex-end',
          //maxWidth: 500,
          borderRadius: 20,
        }}
        key={index}>
        <Text style={{fontSize: 16, color: '#fff'}} key={index}>
          {item.text}
        </Text>
      </View>
    ) : (
      <View
        style={{
          backgroundColor: '#dedede',
          padding: 10,
          marginRight: '45%',
          marginBottom: index === textItems.length - 1 ? 15 : 0,
          marginTop: 5,
          marginLeft: '5%',
          maxWidth: '50%',
          alignSelf: 'flex-start',
          //maxWidth: 500,
          borderRadius: 20,
        }}
        key={index}>
        <Text style={{fontSize: 16, color: '#000'}} key={index}>
          {item.text}
        </Text>
      </View>
    );
  };
  const handleJoinRoom = (roomNr?: number) => {
    setModalVisible(false);
    const chosenNr = roomNr ? roomNr : Math.floor(Math.random() * 1000);
    setRoom(chosenNr);
    joinRoom(chosenNr);
  };

  const onMessageSend = useCallback(async () => {
    setTextItems([
      ...textItems,
      {
        text: textMessage,
        isMe: true,
      },
    ]);
    setTextMessage('');
    RSA.encrypt(textMessage, partner!).then(text => {
      socket.emit('MESSAGE', {
        text,
        recipient: partner,
        sender: myKeypair?.public,
      });
    });
  }, [textItems, textMessage, partner, socket, myKeypair?.public]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={backgroundStyle}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <EnterModal
          handleRandomRoom={() => handleJoinRoom()}
          handleChooseRoom={(roomNr: number) => handleJoinRoom(roomNr)}
          handleClose={() => setModalVisible(false)}
          modalVisible={modalVisible}
        />
        {room && (
          <View>
            <View
              style={{
                backgroundColor: '#0078fe',
                height: '5%',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  textAlign: 'center',
                  color: '#fff',
                }}>
                Room {room} | {serverState}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#dedede',
                height: '5%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text>
                {partner
                  ? `Partner: ${getKeySnippet(partner)}`
                  : 'Waiting for partner...'}
              </Text>
            </View>
            <FlatList
              data={textItems}
              ref={flatListRef}
              renderItem={renderItem}
              style={{height: !partner ? '83%' : '88%', marginBottom: 64}}
            />
            <View
              style={[styles.bottomBar, backgroundStyle]}
              ref={bottomBarRef}>
              {!!partner && (
                <>
                  <TextInput
                    style={styles.input}
                    ref={textInputRef}
                    onChangeText={e => setTextMessage(e)}
                    value={textMessage}
                  />

                  <View style={styles.sendButtonContainer}>
                    <Button
                      icon={<PaperAirplaneIcon />}
                      buttonStyle={styles.sendButton}
                      onPress={onMessageSend}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  sendButtonContainer: {
    marginRight: 16,
  },
  sendButton: {
    backgroundColor: 'black',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 30,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 99,
    flex: 1,
  },
  fullHeight: {
    minHeight: '100%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
