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
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Platform,
} from 'react-native';
import SafeAreaView, {SafeAreaProvider} from 'react-native-safe-area-view';
import {Button} from '@rneui/base';
import {PaperAirplaneIcon, PlusCircleIcon} from 'react-native-heroicons/mini';
import {Colors} from 'react-native/Libraries/NewAppScreen';
// @ts-ignore
import io from 'socket.io-client';
import {KeyPair, RSA} from 'react-native-rsa-native';
import EnterModal from './components/EnterModal';
import {getKeySnippet, sliceIntoChunks} from './util/helpers';
import {launchImageLibrary} from 'react-native-image-picker';
import {MenuView} from '@react-native-menu/menu';

interface TransportMessage {
  text: string[];
  recipient: string;
  sender: string;
}

interface ChatMessage {
  text: string;
  isMe: boolean;
  type?: string;
  width?: number;
  height?: number;
}

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [modalVisible, setModalVisible] = useState(true);
  const [room, setRoom] = useState<number | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [textMessage, setTextMessage] = useState('');
  const [serverState, setServerState] = useState<string>('Loading...');
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const socket = useRef(
    io('http://localhost:3000', {transports: ['websocket']}),
  ).current;
  const [myKeypair, setMyKeypair] = useState<null | KeyPair>(null);
  const [textItems, setTextItems] = useState<ChatMessage[]>([]);

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const notify = (...args) => {};

  const joinRoom = useCallback(
    (roomNr: number) => {
      socket.emit('JOIN', roomNr);
    },
    [socket],
  );
  const sendPublicKey = useCallback(async () => {
    const keypair = await RSA.generateKeys(2056);
    setMyKeypair(keypair);
    socket.emit('PUBLIC_KEY', keypair.public);
  }, [socket]);

  useEffect(() => {
    socket.on('MESSAGE', async (message: TransportMessage) => {
      // Only decrypt messages that were encrypted with the user's public key
      if (message.recipient === myKeypair?.public) {
        // Decrypt the message parts
        const text = (
          await Promise.all(
            message.text.map(
              async part => await RSA.decrypt(part, myKeypair.private),
            ),
          )
        ).join('');
        setTextItems([
          ...textItems,
          {
            text: text,
            isMe: false,
          },
        ]);
      }
    });

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
      setServerState('Waiting for partner...');
      sendPublicKey();
    });
    // Save public key when received
    socket.on('PUBLIC_KEY', (key: string) => {
      setServerState('Partner key received');
      setPartner(key);
    });
    // Clear destination public key if other user leaves room
    socket.on('user disconnected', () => {
      notify(`User Disconnected - ${getKeySnippet(partner!)}`);
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

  const renderItem = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }): JSX.Element => {
    return item.isMe ? (
      <View
        style={[
          styles.textBubbbleBase,
          styles.textBubbleRight,
          item.type === 'image' && styles.textBubbbleImage,
          {
            marginBottom: index === textItems.length - 1 ? 35 : 0,
          },
        ]}
        key={index}>
        <Text style={{fontSize: 16, color: '#fff'}} key={index}>
          {item.type === 'image' && (
            <Image
              source={{
                uri: item.text,
                width: 500,
                height: 400,
              }}
              style={{maxWidth: '100%', maxHeight: 200}}
            />
          )}
          {item.type !== 'image' && item.text}
        </Text>
      </View>
    ) : (
      <View
        style={[
          styles.textBubbbleBase,
          styles.textBubbleLeft,
          item.type === 'image' && styles.textBubbbleImage,
          {
            marginBottom: index === textItems.length - 1 ? 15 : 0,
          },
        ]}
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
    const messageParts = await Promise.all(
      sliceIntoChunks(textMessage, 245).map(
        async part => await RSA.encrypt(part, partner!),
      ),
    );
    socket.emit('MESSAGE', {
      text: messageParts,
      recipient: partner,
      sender: myKeypair?.public,
    });
  }, [textItems, textMessage, partner, socket, myKeypair?.public]);

  const onExit = () => {
    setRoom(null);
    setModalVisible(true);
    setPartner(null);
    setTextItems([]);
    socket.disconnect();
    socket.connect();
  };
  const handleImageSend = useCallback(
    async ({nativeEvent}: {nativeEvent: any}) => {
      if (nativeEvent.event === 'image') {
        try {
          const result = await launchImageLibrary({
            mediaType: 'photo',
            includeBase64: true,
          });
          const [item] = result.assets!;
          const b64String = `data:${item.type};base64,${item.base64!}`;
          setTextItems([
            ...textItems,
            {
              text: `data:${item.type};base64,${item.base64!}`,
              isMe: true,
              type: 'image',
              width: item.width,
              height: item.height,
            },
          ]);
          const messageParts = await Promise.all(
            sliceIntoChunks(b64String, 245).map(
              async part => await RSA.encrypt(part, partner!),
            ),
          );
          socket.emit('MESSAGE', {
            text: messageParts,
            recipient: partner,
            sender: myKeypair?.public,
            type: 'image'
          });
        } catch {}
      }
    },
    [myKeypair?.public, partner, socket, textItems],
  );
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
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}>
            <View>
              <View style={styles.topBarStatus}>
                <Button style={{flex: 1, width: 50}} onPress={onExit}>
                  Exit
                </Button>
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#fff',
                    flex: 1,
                    width: '50%',
                  }}>
                  Room {room} | {serverState}
                </Text>
                <View style={{width: 50}} />
              </View>
              {!!partner && (
                <View style={styles.topBarPartner}>
                  <Text>
                    {partner
                      ? `Partner: ${getKeySnippet(partner)}`
                      : 'Waiting for partner...'}
                  </Text>
                </View>
              )}
              <FlatList
                data={textItems}
                renderItem={renderItem}
                style={{height: partner ? '83%' : '88%', marginBottom: 64}}
              />
              <View style={[styles.bottomBar, backgroundStyle]}>
                {!!partner && (
                  <>
                    <TextInput
                      style={styles.input}
                      onChangeText={e => setTextMessage(e)}
                      value={textMessage}
                    />

                    <View style={styles.sendButtonContainer}>
                      <MenuView
                        onPressAction={handleImageSend}
                        actions={[
                          {
                            id: 'image',
                            title: 'Select Image',
                            titleColor: '#46F289',
                            image: Platform.select({
                              ios: 'photo',
                              android: 'ic_photo',
                            }),
                            imageColor: '#000000',
                          },
                        ]}>
                        <Button
                          icon={<PlusCircleIcon />}
                          buttonStyle={[styles.sendButton, {marginRight: 0}]}
                        />
                      </MenuView>
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
          </TouchableWithoutFeedback>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  sendButtonContainer: {
    marginRight: 16,
    display: 'flex',
    flexDirection: 'row',
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
  textBubbbleBase: {
    padding: 10,
    marginTop: 5,
    maxWidth: '75%',
    borderRadius: 20,
  },
  textBubbbleImage: {
    padding: 0,
    overflow: 'hidden',
  },
  textBubbleLeft: {
    backgroundColor: '#dedede',
    marginRight: '45%',
    marginLeft: '5%',
    alignSelf: 'flex-start',
  },
  textBubbleRight: {
    backgroundColor: '#0078fe',
    marginLeft: '45%',
    marginRight: '5%',
    alignSelf: 'flex-end',
  },
  topBarStatus: {
    backgroundColor: '#0078fe',
    height: '5%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarPartner: {
    backgroundColor: '#dedede',
    height: '5%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
