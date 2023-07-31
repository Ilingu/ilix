import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../../screens/Home";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParticleView from "../../../animations/Particles";
import { useFocusEffect } from "@react-navigation/native";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FileInfo } from "../../../../lib/types/interfaces";
import ApiClient, { HandleGetFilesAndSave } from "../../../../lib/ApiClient";
import { ToastDuration, pushToast } from "../../../../lib/utils";
import PoolContext from "../../../../lib/Context/Pool";
import ProfilePicture from "../../../design/ProfilePicture";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import ColorScheme from "../../../../lib/Theme";
import Separator from "../../../design/Separator";
import {
  AS_Delete,
  AS_Get,
  AS_Store,
  CACHE_KEY,
} from "../../../../lib/db/AsyncStorage";
import AuthContext from "../../../../lib/Context/Auth";
import TransfersContext from "../../../../lib/Context/Transfer";
import Button from "../../../design/Button";

type ViewTransferNavigationProps = NativeStackScreenProps<
  HomeNestedStack,
  "ViewTransfer"
>;
const ViewTransfer: React.FC<ViewTransferNavigationProps> = ({
  navigation,
  route,
}) => {
  const transfer_id = route.params.transfer_id;

  const [, , transfers, refreshTransfer] = useContext(TransfersContext);
  const { pool_key_phrase, device_id } = useContext(AuthContext);
  const { pools } = useContext(PoolContext);

  const [FilesInfo, setFilesInfo] = useState<FileInfo[]>([]);

  const transfer = useMemo(
    () => transfers.find(({ _id }) => _id === transfer_id),
    [transfer_id, transfers]
  );
  if (transfer === undefined) {
    pushToast("Invalid transfer");
    navigation.goBack();
    return <Text>Invalid transfer</Text>;
  }

  const isFirstTime = useRef(true);
  useFocusEffect(
    useCallback(() => {
      return () => {
        isFirstTime.current = true;
        setFilesInfo([]);
      };
    }, [transfer])
  );

  useEffect(() => {
    if (isFirstTime.current) {
      isFirstTime.current = false;
      fetchFilesInfo();
      return;
    }
    fetchFilesInfo(true);
  }, [transfer]);

  const fetchFilesInfo = async (refresh = false) => {
    type CachedFilesInfo = { fi: FileInfo[]; exp: number };

    const failed = () => {
      pushToast("Failed to load files");
      FilesInfo.length <= 0 && navigation.goBack();
    };

    let success = false;
    let filesInfos: FileInfo[] | undefined;
    {
      const { succeed: cacheSuccess, data: cachedData } =
        await AS_Get<CachedFilesInfo>(CACHE_KEY(transfer_id));

      if (
        !refresh &&
        cacheSuccess &&
        cachedData !== undefined &&
        typeof cachedData.exp === "number" &&
        Date.now() < cachedData.exp
      ) {
        success = cacheSuccess;
        filesInfos = cachedData.fi;
      } else {
        const { succeed: apiSuccess, data: apiData } = await ApiClient.get(
          "/files/info?files_ids={files_ids}",
          undefined,
          {
            files_ids: transfer.files_id,
          }
        );

        success = apiSuccess;
        filesInfos = apiData;
      }
    }

    if (!success || !filesInfos || filesInfos.length === 0) return failed();
    if (
      !filesInfos.every(
        (fi) =>
          "_id" in fi &&
          "filename" in fi &&
          "chunkSize" in fi &&
          "length" in fi &&
          "uploadDate" in fi
      )
    )
      return failed();

    const stateFilesInfo = filesInfos.map((fi) => ({
      ...fi,
      uploadDate: {
        $date: {
          $numberLong: parseInt(
            fi.uploadDate.$date.$numberLong as unknown as string
          ),
        },
      },
    }));

    setFilesInfo(stateFilesInfo);
    AS_Store<CachedFilesInfo>(CACHE_KEY(transfer_id), {
      fi: stateFilesInfo,
      exp: Date.now() + 1000 * 60 * 30, // expire in 30min
    });
  };

  const deleteTransfer = async () => {
    if (device_id === undefined || pool_key_phrase === undefined)
      return pushToast("Please join a pool before");

    const { succeed } = await ApiClient.delete(
      "/file-transfer/{pool_kp}/{device_id}/{transfer_id}",
      { device_id, pool_kp: pool_key_phrase, transfer_id: transfer._id },
      undefined
    );

    if (succeed) {
      pushToast("Deleted successfully, refreshing transfer inbox...");
      navigation.goBack();
      refreshTransfer();
    } else pushToast("Failed to delete file");
  };
  const deleteFile = useCallback(
    async (file_id: string) => {
      const { succeed } = await ApiClient.delete(
        "/file/{file_id}",
        { file_id },
        undefined
      );

      if (succeed) {
        pushToast("Deleted successfully");
        if (FilesInfo.length === 1) {
          await AS_Delete(CACHE_KEY(transfer_id));
          setFilesInfo([]);
        }
        refreshTransfer(); // refresh
      } else pushToast("Failed to delete file");
    },
    [FilesInfo, transfer_id]
  );
  const downloadFiles = useCallback(
    async (files_to_download: [string, string][]) => {
      if (pool_key_phrase === undefined)
        return pushToast("Please join a pool before");

      pushToast("Downloading... (might take a long time)", ToastDuration.LONG);
      const { succeed } = await HandleGetFilesAndSave(
        files_to_download,
        pool_key_phrase
      );

      if (succeed) pushToast("Downloaded successfully");
      else pushToast("Failed to download all files");
    },
    []
  );

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-5/6 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}
        >
          <View
            style={tw`flex flex-row items-center justify-center gap-x-2 mt-2`}
          >
            <ProfilePicture width={32} height={32} />
            <Text style={tw`font-semibold`}>
              {pools?.currentName(transfer.from)}
            </Text>
            <Text style={tw`text-center `}>
              sent you a box{" "}
              <FontAwesome5
                name="box"
                size={12}
                color={`${ColorScheme.PRIMARY_CONTENT}`}
              />
            </Text>
          </View>

          <View
            style={tw`mx-2 flex flex-row items-center justify-between gap-x-2 mt-2`}
          >
            <Button
              parentProps={{
                style: tw`grow basis-0`,
                onPress: () =>
                  downloadFiles(
                    FilesInfo.map(({ _id: { $oid }, filename }) => [
                      $oid,
                      filename,
                    ])
                  ),
              }}
              childStyle={tw`bg-white text-[${ColorScheme.PRIMARY_CONTENT}]  border-2 border-black`}
            >
              <AntDesign name="download" size={18} color="black" /> Download all
            </Button>
            <Button
              parentProps={{ style: tw`grow basis-0`, onPress: deleteTransfer }}
              childStyle={tw`bg-white text-[${ColorScheme.PRIMARY_CONTENT}]  border-2 border-black`}
            >
              <AntDesign name="delete" size={18} color="black" /> Delete
            </Button>
          </View>

          <Separator />

          <View style={tw`max-h-60 overflow-hidden`}>
            <FlatList
              data={FilesInfo}
              renderItem={({ index, item }) => (
                <File
                  key={index}
                  fi={item}
                  deleteFile={deleteFile}
                  downloadFiles={downloadFiles}
                />
              )}
            />
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};

type FileProps = {
  fi: FileInfo;
  deleteFile: (file_id: string) => Promise<void>;
  downloadFiles: (files_to_download: [string, string][]) => Promise<void>;
};
const File: React.FC<FileProps> = ({ fi, deleteFile, downloadFiles }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={tw`mx-2 p-2 border-2 border-black rounded-lg mb-2`}>
      <TouchableOpacity
        style={tw`flex flex-row items-center gap-x-2`}
        onPress={() => setOpen((prev) => !prev)}
      >
        <Image
          source={
            [
              require("../../../../assets/Images/box1.png"),
              require("../../../../assets/Images/box2.png"),
              require("../../../../assets/Images/box3.png"),
            ][Math.round(Math.random() * 2)]
          }
          style={tw`w-[32px] h-[32px] rounded-xl`}
        />
        <Text style={tw`font-semibold`}>
          {fi.filename.length <= 17
            ? fi.filename
            : `${fi.filename.slice(0, 18 - 3)}..`}
        </Text>
        <Text style={tw`font-semibold`}>|</Text>
        <Text style={tw`font-semibold flex-1`}>
          {Intl.NumberFormat("en", { notation: "compact" }).format(fi.length)}B
        </Text>
        <TouchableOpacity
          style={tw`bg-white w-7 h-7 shadow-sm rounded border-2 border-black flex justify-center items-center`}
          onPress={() => deleteFile(fi._id.$oid)}
        >
          <AntDesign name="minussquare" size={14} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-white w-7 h-7 shadow-sm rounded border-2 border-black flex justify-center items-center`}
          onPress={() => downloadFiles([[fi._id.$oid, fi.filename]])}
        >
          <AntDesign name="download" size={14} color="black" />
        </TouchableOpacity>
      </TouchableOpacity>
      {open && (
        <View>
          <Text selectable>
            {"\u2022"} Filename:{" "}
            <Text style={tw`font-bold`}>{fi.filename}</Text>
          </Text>
          <Text selectable>
            {"\u2022"} Size:{" "}
            <Text style={tw`font-bold`}>
              {Intl.NumberFormat("en", { notation: "compact" }).format(
                fi.length
              )}
              B
            </Text>
          </Text>
          <Text selectable>
            {"\u2022"} Upload date:{" "}
            <Text style={tw`font-bold`}>
              {new Date(fi.uploadDate.$date.$numberLong).toLocaleDateString()}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export default ViewTransfer;
