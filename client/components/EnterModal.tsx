/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
//@ts-ignore
import Divider from 'react-native-divider';

interface EnterModalProps {
  handleClose: () => void;
  handleRandomRoom: () => void;
  handleChooseRoom: (roomNr: number) => void;
  modalVisible: boolean;
}

const EnterModal = ({
  handleClose,
  modalVisible,
  handleRandomRoom,
  handleChooseRoom,
}: EnterModalProps) => {
  const [room, setRoom] = useState<number | null>(null);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={'padding'} style={styles.safeAreaView}>
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          accessible={false}
          style={{width: '100%'}}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text
                style={[
                  styles.textStyle,
                  {
                    fontWeight: '700',
                    color: 'black',
                    marginBottom: 12,
                    fontSize: 20,
                  },
                ]}>
                Open Cryptochat
              </Text>
              <Pressable
                style={[styles.button, styles.buttonClose, {marginTop: 8}]}
                onPress={handleRandomRoom}>
                <Text style={styles.textStyle}>Create Random Room</Text>
              </Pressable>
              <Divider orientation="center"> Or </Divider>
              <View>
                <View>
                  <TextInput
                    onChangeText={text => setRoom(+text)}
                    style={[styles.input, {maxHeight: 40, width: 120}]}
                  />
                </View>
                <Pressable
                  style={[styles.button, styles.buttonClose, {marginTop: 8}]}
                  onPress={() => handleChooseRoom(room!)}>
                  <Text style={styles.textStyle}>Enter Room</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'whitesmoke',
    width: '100%',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 200,
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
  input: {
    height: 40,
    borderWidth: 1,
    padding: 10,
    borderRadius: 99,
    flex: 1,
  },
  safeAreaView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

export default EnterModal;
